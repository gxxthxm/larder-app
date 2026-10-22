import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Check, Clock, CookingPot, Flame, Gauge, X } from 'lucide-react';
import { getRecipe } from '@/data/recipes';
import { useLarder } from '@/store/useLarder';
import { useUI } from '@/store/useUI';
import { scoreRecipe, type OwnedIngredient } from '@/lib/scoring';
import { getCatalogueItem } from '@/lib/catalogue';
import { daysLeft } from '@/lib/dates';
import { convert, formatQty, stepFor, tidy } from '@/lib/units';
import { monthStats } from '@/lib/impact';
import { useToday } from '@/lib/useToday';
import { cn, formatMoney } from '@/lib/utils';
import { tick } from '@/lib/haptics';
import { EmojiTile } from '@/components/EmojiTile';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { MatchRing, missingLabel, recipeTint } from '@/components/RecipeCard';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Stepper } from '@/components/ui/stepper';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { EmptyState } from '@/components/EmptyState';
import type { Item, RecipeIngredient } from '@/lib/types';

function amountLabel(ing: RecipeIngredient): string {
  return formatQty(ing.amount, ing.unit);
}

/** How much of an item cooking this recipe would use. Urgent items default to all of it. */
export function defaultUse(ing: RecipeIngredient, item: Item, days: number): number {
  if (days <= 2) return item.quantity;
  const converted = convert(ing.amount, ing.unit, item.unit);
  let q = converted ?? Math.min(1, item.quantity);
  q = Math.min(q, item.quantity);
  if (q >= item.quantity * 0.8) q = item.quantity;
  return tidy(q);
}

interface Line {
  item: Item;
  ing: RecipeIngredient;
  days: number;
  qty: number;
  max: number;
}

function CookSheet({
  open,
  onClose,
  title,
  owned,
  onCooked,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  owned: OwnedIngredient[];
  onCooked: () => void;
}) {
  const navigate = useNavigate();
  const today = useToday();
  const currency = useLarder((s) => s.settings.currency);
  const [lines, setLines] = useState<Line[]>([]);
  const [done, setDone] = useState<{
    count: number;
    value: number;
    before: number;
    after: number;
  } | null>(null);
  const [shownSaved, setShownSaved] = useState(0);

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setLines(
      owned
        .filter((o): o is OwnedIngredient & { item: Item } => !!o.item)
        .map((o) => {
          const days = daysLeft(o.item, today);
          return {
            item: o.item,
            ing: o.ingredient,
            days,
            qty: defaultUse(o.ingredient, o.item, days),
            max: o.item.quantity,
          };
        })
        .sort((a, b) => a.days - b.days),
    );
  }, [open, owned, today]);

  const active = lines.filter((l) => l.qty > 0);

  const confirm = () => {
    const state = useLarder.getState();
    const before = monthStats(state.events).saved;
    const urgentCleared = active.filter((l) => l.days <= 2 && tidy(l.qty) >= tidy(l.max)).length;
    const events = state.cook(active.map((l) => ({ itemId: l.item.id, quantity: l.qty })));
    const after = monthStats(useLarder.getState().events).saved;
    tick(20);
    setShownSaved(before);
    setDone({
      count: events.length,
      value: events.reduce((s, e) => s + e.value, 0),
      before,
      after,
    });
    window.setTimeout(() => setShownSaved(after), 450);
    onCooked();
    if (urgentCleared >= 3 && !state.settings.celebrated) {
      useUI.getState().celebrate();
      state.updateSettings({ celebrated: true });
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={done ? 'Cooked!' : 'What did you use?'}
      description={done ? undefined : 'We’ll take these out of your kitchen.'}
      hideHeader={!!done}
      size="sm"
      footer={
        done ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
              Done
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                onClose();
                navigate('/');
              }}
            >
              Back home
            </Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" disabled={!active.length} onClick={confirm}>
            <Check className="size-5" strokeWidth={2.6} /> Confirm · {active.length}{' '}
            {active.length === 1 ? 'item' : 'items'}
          </Button>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-4 text-center"
          >
            <motion.svg viewBox="0 0 80 80" className="size-24" aria-hidden>
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                fill="var(--brand-soft)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                style={{ originX: '50%', originY: '50%' }}
              />
              <motion.path
                d="M25 41 l10 10 l20 -22"
                fill="none"
                stroke="var(--brand)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.2, duration: 0.45, ease: 'easeOut' }}
              />
            </motion.svg>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
              Enjoy your {title.toLowerCase()}!
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              {done.count} {done.count === 1 ? 'item' : 'items'} used up
              {done.value > 0 && ` · ${formatMoney(done.value, currency)} of food saved`}
            </p>
            <div className="mt-5 w-full rounded-[22px] bg-brand-soft p-4">
              <p className="text-xs font-bold tracking-wider text-brand-soft-ink uppercase">
                Saved this month
              </p>
              <AnimatedNumber
                value={shownSaved}
                fromZero={false}
                duration={1.4}
                format={(n) => formatMoney(n, currency)}
                className="tabular mt-1 block font-display text-4xl font-semibold text-brand-soft-ink"
              />
            </div>
          </motion.div>
        ) : (
          <motion.ul key="confirm" className="space-y-2" exit={{ opacity: 0, x: -20 }}>
            {lines.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-2">
                None of these ingredients are in your kitchen yet.
              </p>
            )}
            {lines.map((l, i) => {
              const on = l.qty > 0;
              return (
                <motion.li
                  key={l.item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                  className={cn(
                    'rounded-[20px] border p-2.5 transition-colors',
                    on ? 'border-line bg-card-2/60' : 'border-dashed border-line-strong opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setLines((ls) =>
                          ls.map((x) =>
                            x.item.id === l.item.id
                              ? { ...x, qty: on ? 0 : defaultUse(x.ing, x.item, x.days) }
                              : x,
                          ),
                        )
                      }
                      aria-pressed={on}
                      aria-label={`${on ? 'Skip' : 'Include'} ${l.item.name}`}
                      className={cn(
                        'grid size-11 shrink-0 place-items-center rounded-full transition-colors',
                        on ? 'bg-brand text-brand-ink' : 'bg-card-3 text-ink-3',
                      )}
                    >
                      <Check className="size-5" strokeWidth={3} />
                    </button>
                    <EmojiTile emoji={l.item.emoji} catalogueId={l.item.catalogueId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{l.item.name}</p>
                      <p className="text-xs text-ink-2">
                        Have {formatQty(l.item.quantity, l.item.unit)}
                        {l.days <= 2 && (
                          <span className="font-semibold text-today-ink"> · going off soon</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {on && (
                    <Stepper
                      size="sm"
                      className="mt-2"
                      value={l.qty}
                      onChange={(q) =>
                        setLines((ls) =>
                          ls.map((x) => (x.item.id === l.item.id ? { ...x, qty: q } : x)),
                        )
                      }
                      step={stepFor(l.item.unit, l.max)}
                      min={0}
                      max={l.max}
                      suffix={l.item.unit === 'pcs' ? '' : l.item.unit}
                      label={`${l.item.name} used`}
                    />
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const recipe = getRecipe(id);
  const items = useLarder((s) => s.items);
  const today = useToday();
  const [cookOpen, setCookOpen] = useState(false);
  const [cooked, setCooked] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [frozenOwned, setFrozenOwned] = useState<OwnedIngredient[]>([]);

  const scored = useMemo(
    () => (recipe ? scoreRecipe(recipe, items, today) : undefined),
    [recipe, items, today],
  );

  if (!recipe || !scored) {
    return (
      <EmptyState
        emoji="🍽️"
        title="Recipe not found"
        action={<Button onClick={() => navigate('/recipes')}>See all recipes</Button>}
      >
        It may have been renamed.
      </EmptyState>
    );
  }

  const have = scored.owned;
  const ownedIds = new Set(have.map((o) => o.ingredient.catalogueId));
  const missingOptional = recipe.ingredients.filter(
    (i) => i.optional && !ownedIds.has(i.catalogueId),
  );
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/recipes'));
  const consumable = have.filter((o) => o.item);

  const openCook = () => {
    setFrozenOwned(consumable);
    setCookOpen(true);
  };

  return (
    <div className="pt-3 md:pt-8">
      <div className="mb-4 flex items-center justify-between">
        <motion.button
          type="button"
          onClick={back}
          whileTap={{ scale: 0.9 }}
          aria-label="Back"
          className="grid size-11 place-items-center rounded-full border border-line bg-card shadow-card"
        >
          <ArrowLeft className="size-5" />
        </motion.button>
        {cooked && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-soft-ink"
          >
            <Check className="size-4" strokeWidth={3} /> Cooked today
          </motion.span>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className={cn(
              'relative grid h-52 place-items-center overflow-hidden rounded-[32px] bg-gradient-to-br md:h-64',
              recipeTint(recipe.id),
            )}
          >
            <motion.span
              className="text-[110px] leading-none drop-shadow-[0_12px_20px_rgb(0_0_0/0.15)]"
              initial={{ y: 30, scale: 0.6, rotate: -12 }}
              animate={{ y: [0, -6, 0], scale: 1, rotate: 0 }}
              transition={{
                y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
                scale: { type: 'spring', stiffness: 260, damping: 14 },
                rotate: { type: 'spring', stiffness: 200, damping: 12 },
              }}
              aria-hidden
            >
              {recipe.emoji}
            </motion.span>
          </motion.div>

          <div>
            <h1 className="font-display text-[32px] leading-[1.05] font-semibold tracking-[-0.025em]">
              {recipe.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill icon={<Clock className="size-3.5" />}>{recipe.minutes} min</Pill>
              <Pill icon={<Gauge className="size-3.5" />}>{recipe.difficulty}</Pill>
              {recipe.tags.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          </div>

          <div className="card flex items-center gap-3.5 p-4">
            <MatchRing s={scored} size={52} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                {scored.expiring.length > 0 ? (
                  <>
                    <Flame className="size-4 text-today" aria-hidden /> Uses{' '}
                    {scored.expiring.length} expiring{' '}
                    {scored.expiring.length === 1 ? 'item' : 'items'}
                  </>
                ) : (
                  'Nothing urgent in this one'
                )}
              </p>
              <p
                className={cn(
                  'text-sm',
                  scored.missing.length ? 'text-ink-2' : 'text-brand-soft-ink',
                )}
              >
                {missingLabel(scored)}
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <CookButton onClick={openCook} disabled={!consumable.length} />
          </div>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="ingredients" className="card p-4">
            <h2 id="ingredients" className="mb-3 font-display text-xl font-semibold tracking-tight">
              Ingredients
            </h2>
            <ul className="space-y-1">
              {have.map((o) => (
                <IngredientRow key={o.ingredient.catalogueId} ing={o.ingredient} owned={o} />
              ))}
              {scored.missing.map((m) => (
                <IngredientRow key={m.catalogueId} ing={m} />
              ))}
              {missingOptional.map((m) => (
                <IngredientRow key={m.catalogueId} ing={m} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="steps">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="steps" className="font-display text-xl font-semibold tracking-tight">
                Steps
              </h2>
              <span className="tabular text-sm text-ink-2">
                {doneSteps.size} of {recipe.steps.length} done
              </span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-card-2" aria-hidden>
              <motion.div
                className="h-full rounded-full bg-brand"
                animate={{ width: `${(doneSteps.size / recipe.steps.length) * 100}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
              />
            </div>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => {
                const done = doneSteps.has(i);
                return (
                  <li key={i}>
                    <button
                      type="button"
                      aria-pressed={done}
                      onClick={() =>
                        setDoneSteps((s) => {
                          const n = new Set(s);
                          if (n.has(i)) n.delete(i);
                          else n.add(i);
                          return n;
                        })
                      }
                      className={cn(
                        'flex w-full gap-3 rounded-[20px] p-3.5 text-left transition-colors',
                        done ? 'bg-brand-soft/60' : 'bg-card shadow-card',
                      )}
                    >
                      <motion.span
                        animate={{ scale: done ? [1, 1.25, 1] : 1 }}
                        className={cn(
                          'tabular grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                          done ? 'bg-brand text-brand-ink' : 'bg-card-2 text-ink-2',
                        )}
                      >
                        {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                      </motion.span>
                      <span
                        className={cn(
                          'pt-1 text-[15px] leading-relaxed transition-colors',
                          done && 'text-ink-2 line-through decoration-ink-3/50',
                        )}
                      >
                        {step}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>

      <div className="sticky bottom-[calc(92px+env(safe-area-inset-bottom))] z-10 mt-6 lg:hidden">
        <CookButton onClick={openCook} disabled={!consumable.length} />
      </div>

      <CookSheet
        open={cookOpen}
        onClose={() => setCookOpen(false)}
        title={recipe.title}
        owned={frozenOwned}
        onCooked={() => setCooked(true)}
      />
    </div>
  );
}

function CookButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button size="lg" className="w-full shadow-float" onClick={onClick} disabled={disabled}>
      <CookingPot className="size-5" /> Cooked this
    </Button>
  );
}

function Pill({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-[13px] font-semibold text-ink-2">
      {icon}
      {children}
    </span>
  );
}

function IngredientRow({ ing, owned }: { ing: RecipeIngredient; owned?: OwnedIngredient }) {
  const c = getCatalogueItem(ing.catalogueId);
  const staple = owned && !owned.item;
  const has = !!owned;
  return (
    <li className="flex min-h-14 items-center gap-3 rounded-[16px] px-1 py-1.5">
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full',
          has
            ? 'bg-brand text-brand-ink'
            : ing.optional
              ? 'bg-card-2 text-ink-3'
              : 'bg-expired-soft text-expired-ink',
        )}
        aria-label={
          has ? 'In your kitchen' : ing.optional ? 'Optional, not in your kitchen' : 'Missing'
        }
        role="img"
      >
        {has ? (
          <Check className="size-4" strokeWidth={3} />
        ) : (
          <X className="size-4" strokeWidth={3} />
        )}
      </span>
      <EmojiTile
        emoji={owned?.item?.emoji ?? c?.emoji ?? '🛒'}
        catalogueId={ing.catalogueId}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[15px] font-semibold', !has && 'text-ink-2')}>
          {c?.name ?? ing.catalogueId}
          {ing.optional && <span className="ml-1.5 text-xs font-medium text-ink-3">optional</span>}
        </p>
        <p className="text-xs text-ink-3">{amountLabel(ing)}</p>
      </div>
      {owned?.daysLeft !== undefined ? (
        <UrgencyBadge days={owned.daysLeft} compact frozen={owned.item?.location === 'Freezer'} />
      ) : staple ? (
        <span className="text-xs font-medium text-ink-3">Pantry staple</span>
      ) : (
        <span
          className={cn('text-xs font-semibold', ing.optional ? 'text-ink-3' : 'text-expired-ink')}
        >
          {ing.optional ? 'Skip it' : 'Missing'}
        </span>
      )}
    </li>
  );
}
