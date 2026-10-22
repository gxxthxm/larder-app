import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ArrowLeft, Check, Pencil, Snowflake, Trash2, TriangleAlert } from 'lucide-react';
import { useLarder } from '@/store/useLarder';
import { toast } from '@/store/useToasts';
import { LOCATIONS, TOSS_REASONS, UNITS, type Location, type Unit } from '@/lib/types';
import { bandFor, daysLeft, daysLeftLabel, formatDate } from '@/lib/dates';
import { canFreeze, getCatalogueItem } from '@/lib/catalogue';
import { rankRecipes } from '@/lib/scoring';
import { formatQty, stepFor } from '@/lib/units';
import { useToday } from '@/lib/useToday';
import { cn, formatMoney } from '@/lib/utils';
import { recipes } from '@/data/recipes';
import { EmojiTile } from '@/components/EmojiTile';
import { RecipeCard } from '@/components/RecipeCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Segmented } from '@/components/ui/segmented';
import { useItemActions } from '@/components/ItemActions';
import { BAND_STYLE } from '@/components/urgency';

function undo() {
  if (useLarder.getState().undo()) toast({ title: 'Undone', emoji: '↩️', duration: 2200 });
}

const label = 'text-[13px] font-semibold text-ink-2';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = useToday();
  const item = useLarder((s) => s.items.find((i) => i.id === id));
  const events = useLarder((s) => s.events);
  const currency = useLarder((s) => s.settings.currency);
  const actions = useItemActions();
  const [editingName, setEditingName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const seen = useRef(false);

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/inventory'));

  // When the item is used up or tossed from this screen, head back.
  useEffect(() => {
    if (item) seen.current = true;
    else if (seen.current) back();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const history = useMemo(
    () =>
      item
        ? events
            .filter((e) =>
              item.catalogueId ? e.catalogueId === item.catalogueId : e.itemName === item.name,
            )
            .slice(0, 8)
        : [],
    [events, item],
  );
  const related = useMemo(() => {
    if (!item?.catalogueId) return [];
    const list = useLarder.getState().items;
    return rankRecipes(
      recipes.filter((r) => r.ingredients.some((i) => i.catalogueId === item.catalogueId)),
      list,
      today,
    ).slice(0, 4);
  }, [today, item]);

  if (!item) {
    return (
      <EmptyState
        emoji="🫙"
        title="This item isn’t in your kitchen"
        action={<Button onClick={() => navigate('/inventory')}>Back to kitchen</Button>}
      >
        It may have been used up, tossed or deleted.
      </EmptyState>
    );
  }

  const c = getCatalogueItem(item.catalogueId);
  const days = daysLeft(item, today);
  const band = bandFor(days);
  const frozen = item.location === 'Freezer';
  const total = Math.max(
    1,
    differenceInCalendarDays(parseISO(item.expiresAt), parseISO(item.addedAt)),
  );
  const remaining = Math.max(0, Math.min(1, days / total));
  const update = useLarder.getState().updateItem;

  const changeLocation = (loc: Location) => {
    useLarder.getState().moveItem(item.id, loc);
    const next = useLarder.getState().items.find((i) => i.id === item.id);
    toast({
      title: `Moved to ${loc.toLowerCase()}`,
      description: next ? `Use by ${formatDate(next.expiresAt, 'd MMM yyyy')}` : undefined,
      emoji: loc === 'Freezer' ? '❄️' : loc === 'Fridge' ? '🧊' : '🫙',
      action: { label: 'Undo', onClick: undo },
    });
  };

  const del = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    useLarder.getState().deleteItem(item.id);
    toast({
      title: `Deleted ${item.name}`,
      description: 'Not counted as waste.',
      emoji: '🗑️',
      action: { label: 'Undo', onClick: undo },
    });
  };

  return (
    <div className="pt-3 md:pt-8">
      <div className="mb-5 flex items-center justify-between">
        <motion.button
          type="button"
          onClick={back}
          whileTap={{ scale: 0.9 }}
          aria-label="Back"
          className="grid size-11 place-items-center rounded-full border border-line bg-card shadow-card"
        >
          <ArrowLeft className="size-5" />
        </motion.button>
        <motion.button
          type="button"
          onClick={del}
          layout
          whileTap={{ scale: 0.94 }}
          className={cn(
            'flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
            confirmDelete
              ? 'bg-expired text-white'
              : 'border border-line bg-card text-ink-2 shadow-card',
          )}
        >
          <Trash2 className="size-4" />
          {confirmDelete ? 'Tap again to delete' : 'Delete'}
        </motion.button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.6, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            >
              <EmojiTile emoji={item.emoji} catalogueId={item.catalogueId} size="xl" />
            </motion.div>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEditingName(false);
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Item name"
                    defaultValue={item.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== item.name) update(item.id, { name: v });
                      setEditingName(false);
                    }}
                    className="h-12 w-full rounded-[14px] border border-brand bg-card px-3 font-display text-2xl font-semibold outline-none"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="group flex items-center gap-2 text-left"
                  aria-label={`Rename ${item.name}`}
                >
                  <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight">
                    {item.name}
                  </h1>
                  <Pencil className="size-4 text-ink-3 opacity-60 transition-opacity group-hover:opacity-100" />
                </button>
              )}
              <p className="mt-0.5 text-sm text-ink-2">
                {c?.category ?? 'Custom item'} · {formatQty(item.quantity, item.unit)} ·{' '}
                {item.location}
              </p>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {days < 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-start gap-3 rounded-[20px] bg-expired-soft p-4 text-expired-ink"
                  role="status"
                >
                  <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-semibold">{daysLeftLabel(days)}</p>
                    <p className="text-sm opacity-85">
                      Give it a look and a sniff before using — or toss it and we’ll log it.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            {frozen && days >= 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-start gap-3 rounded-[20px] bg-frost-soft p-4 text-frost-ink"
                  role="status"
                >
                  <Snowflake className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Frozen · keeps till {formatDate(item.expiresAt, 'd MMM yyyy')}
                    </p>
                    <p className="text-sm opacity-85">
                      Thaw in the fridge the night before you cook it.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="card overflow-hidden p-5" aria-label="Freshness">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">
                  {days < 0 ? 'Expired' : 'Days left'}
                </p>
                <p
                  className={cn(
                    'tabular font-display text-[56px] leading-none font-semibold tracking-tight',
                    frozen ? 'text-frost-ink' : BAND_STYLE[band].ink,
                  )}
                >
                  {Math.abs(days)}
                </p>
              </div>
              <div className="pb-1 text-right">
                <p className="font-semibold">{daysLeftLabel(days)}</p>
                <p className="text-sm text-ink-2">
                  Use by {format(parseISO(item.expiresAt), 'EEE d MMM')}
                </p>
              </div>
            </div>
            <div
              className="mt-4 h-2.5 overflow-hidden rounded-full bg-card-2"
              role="meter"
              aria-label="Freshness left"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(remaining * 100)}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: frozen ? 'var(--frost)' : BAND_STYLE[band].color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(remaining * 100, days < 0 ? 100 : 3)}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-3">Added {formatDate(item.addedAt, 'd MMM')}</p>
          </section>

          <div className="grid grid-cols-3 gap-2">
            <ActionTile
              onClick={() => actions.openUse(item)}
              icon={<Check className="size-5" strokeWidth={2.6} />}
              label="Used"
              className="bg-brand-soft text-brand-soft-ink"
            />
            <ActionTile
              onClick={() => actions.openToss(item)}
              icon={<Trash2 className="size-5" />}
              label="Toss"
              className="bg-expired-soft text-expired-ink"
            />
            <ActionTile
              onClick={() => actions.freeze(item)}
              icon={<Snowflake className="size-5" />}
              label={frozen ? 'Frozen' : 'Freeze'}
              disabled={frozen || days < 0 || !canFreeze(item.catalogueId)}
              className="bg-frost-soft text-frost-ink"
            />
          </div>
        </div>

        <div className="space-y-5">
          <section className="card space-y-4 p-5" aria-labelledby="details">
            <h2 id="details" className="font-display text-xl font-semibold tracking-tight">
              Details
            </h2>
            <div>
              <p className={cn(label, 'mb-1.5')}>Quantity</p>
              <div className="flex gap-2">
                <Stepper
                  value={item.quantity}
                  onChange={(q) => {
                    const price = item.price
                      ? Math.round((item.price / item.quantity) * q)
                      : undefined;
                    update(item.id, { quantity: q, price });
                  }}
                  step={stepFor(item.unit, item.quantity)}
                  min={stepFor(item.unit, item.quantity)}
                  label="quantity"
                  className="flex-1"
                />
                <select
                  aria-label="Unit"
                  value={item.unit}
                  onChange={(e) => update(item.id, { unit: e.target.value as Unit })}
                  className="h-[52px] w-[92px] rounded-full border border-line bg-card-2 px-4 font-semibold"
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <p className={cn(label, 'mb-1.5')}>Location</p>
              <Segmented<Location>
                id="detail-loc"
                label="Location"
                value={item.location}
                onChange={changeLocation}
                options={LOCATIONS.map((l) => ({ value: l, label: l }))}
              />
              {!frozen && days >= 0 && canFreeze(item.catalogueId) && c?.shelfLifeDays.Freezer && (
                <p className="mt-1.5 text-xs text-ink-3">
                  Freezing gives it about {c.shelfLifeDays.Freezer} days.
                </p>
              )}
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-2">
              <label className="block">
                <span className={cn(label, 'mb-1.5 block')}>Use by</span>
                <input
                  type="date"
                  value={item.expiresAt}
                  onChange={(e) => e.target.value && update(item.id, { expiresAt: e.target.value })}
                  className="h-12 w-full rounded-[16px] border border-line bg-card-2 px-3 outline-none focus:border-brand"
                />
              </label>
              <label className="block">
                <span className={cn(label, 'mb-1.5 block')}>Price</span>
                <span className="relative block">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2">
                    {currency}
                  </span>
                  <input
                    inputMode="decimal"
                    value={item.price ?? ''}
                    placeholder="0"
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                      update(item.id, { price: Number.isFinite(v) ? v : undefined });
                    }}
                    className="h-12 w-full rounded-[16px] border border-line bg-card-2 pr-3 pl-8 outline-none focus:border-brand"
                  />
                </span>
              </label>
            </div>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="uses">
              <h2 id="uses" className="mb-3 font-display text-xl font-semibold tracking-tight">
                Recipes that use it
              </h2>
              <ul className="space-y-3">
                {related.map((s, i) => (
                  <RecipeCard key={s.recipe.id} s={s} index={i} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="history" className="card p-5">
            <h2 id="history" className="mb-3 font-display text-xl font-semibold tracking-tight">
              History
            </h2>
            {history.length === 0 ? (
              <p className="text-sm text-ink-2">
                No history yet. Used and tossed {item.name.toLowerCase()} will show up here.
              </p>
            ) : (
              <ul className="space-y-1">
                {history.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2">
                    <span
                      className={cn(
                        'grid size-9 place-items-center rounded-full',
                        e.type === 'used'
                          ? 'bg-brand-soft text-brand-soft-ink'
                          : 'bg-expired-soft text-expired-ink',
                      )}
                    >
                      {e.type === 'used' ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {e.type === 'used' ? 'Used' : 'Tossed'}{' '}
                        {e.unit ? formatQty(e.quantity, e.unit) : e.quantity}
                        {e.reason && (
                          <span className="font-normal text-ink-2">
                            {' '}
                            · {TOSS_REASONS.find((r) => r.id === e.reason)?.label}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-3">{format(parseISO(e.at), 'EEE d MMM')}</p>
                    </div>
                    <span
                      className={cn(
                        'tabular text-sm font-semibold',
                        e.type === 'used' ? 'text-brand-soft-ink' : 'text-expired-ink',
                      )}
                    >
                      {formatMoney(e.value, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ActionTile({
  onClick,
  icon,
  label,
  className,
  disabled,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.94 }}
      className={cn(
        'flex h-[72px] flex-col items-center justify-center gap-1 rounded-[20px] text-sm font-semibold transition disabled:opacity-40',
        className,
      )}
    >
      {icon}
      {label}
    </motion.button>
  );
}
