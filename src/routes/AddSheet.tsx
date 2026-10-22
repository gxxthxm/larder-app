import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ListPlus, Plus, Sparkles, Trash2, Zap } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Segmented } from '@/components/ui/segmented';
import { EmojiTile } from '@/components/EmojiTile';
import { draftItem, useLarder } from '@/store/useLarder';
import { toast } from '@/store/useToasts';
import { defaultExpiry, searchCatalogue, typicalPriceFor } from '@/lib/catalogue';
import { addDaysISO, daysLeftLabel } from '@/lib/dates';
import { parseBulk, type BulkRow } from '@/lib/parseBulk';
import { LOCATIONS, UNITS, type CatalogueItem, type Location, type Unit } from '@/lib/types';
import { stepFor, formatQty } from '@/lib/units';
import { cn, formatMoney } from '@/lib/utils';

const CUSTOM_EMOJIS = ['🛒', '🥫', '🍱', '🧃', '🫙', '🥡', '🍪', '🥗'];

function undo() {
  if (useLarder.getState().undo()) toast({ title: 'Undone', emoji: '↩️', duration: 2200 });
}

const fieldLabel = 'mb-1.5 block text-[13px] font-semibold text-ink-2';
const inputCls =
  'h-12 w-full rounded-[16px] border border-line bg-card-2 px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand focus:bg-card';

function QuickAdd() {
  const currency = useLarder((s) => s.settings.currency);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<CatalogueItem | undefined>();
  const [emoji, setEmoji] = useState('🛒');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<Unit>('pcs');
  const [location, setLocation] = useState<Location>('Fridge');
  const [expiresAt, setExpiresAt] = useState(addDaysISO(7));
  const [price, setPrice] = useState('');
  const [touched, setTouched] = useState({ expiry: false, price: false });
  const [highlight, setHighlight] = useState(0);
  const [focused, setFocused] = useState(false);
  const [added, setAdded] = useState<{ id: string; emoji: string; name: string }[]>([]);

  const suggestions = useMemo(
    () => (picked && picked.name === name ? [] : searchCatalogue(name, 6)),
    [name, picked],
  );
  const showSuggestions = focused && suggestions.length > 0;
  const isCustom = name.trim().length > 1 && !picked && suggestions.length === 0;

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 350);
    return () => window.clearTimeout(id);
  }, []);

  const pick = (c: CatalogueItem) => {
    setPicked(c);
    setName(c.name);
    setEmoji(c.emoji);
    setQty(1);
    setUnit(c.defaultUnit);
    setLocation(c.defaultLocation);
    setExpiresAt(defaultExpiry(c, c.defaultLocation));
    setPrice(String(typicalPriceFor(c, 1, c.defaultUnit)));
    setTouched({ expiry: false, price: false });
    setFocused(false);
  };

  const changeLocation = (loc: Location) => {
    setLocation(loc);
    if (!touched.expiry) setExpiresAt(defaultExpiry(picked, loc));
  };

  const changeQty = (q: number, u: Unit = unit) => {
    setQty(q);
    setUnit(u);
    if (picked && !touched.price) setPrice(String(typicalPriceFor(picked, q, u)));
  };

  const reset = () => {
    setName('');
    setPicked(undefined);
    setEmoji('🛒');
    setQty(1);
    setUnit('pcs');
    setLocation('Fridge');
    setExpiresAt(addDaysISO(7));
    setPrice('');
    setTouched({ expiry: false, price: false });
    inputRef.current?.focus();
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      inputRef.current?.focus();
      return;
    }
    const p = parseFloat(price);
    const [item] = useLarder.getState().addItems([
      draftItem({
        name: name.trim(),
        catalogueId: picked?.id,
        emoji: picked ? undefined : emoji,
        location,
        quantity: qty,
        unit,
        price: Number.isFinite(p) ? p : undefined,
        expiresAt,
      }),
    ]);
    setAdded((a) => [{ id: item.id, emoji: item.emoji, name: item.name }, ...a].slice(0, 8));
    toast({
      title: `Added ${item.name}`,
      description: `${location} · ${daysLeftLabel(differenceInCalendarDays(parseISO(expiresAt), new Date()))}`,
      emoji: item.emoji,
      action: { label: 'Undo', onClick: undo },
    });
    reset();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(suggestions[highlight] ?? suggestions[0]);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  const days = differenceInCalendarDays(parseISO(expiresAt), new Date());

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="relative">
        <label htmlFor="add-name" className={fieldLabel}>
          What did you buy?
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2">
            <motion.span
              key={emoji}
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="block"
            >
              <EmojiTile emoji={emoji} catalogueId={picked?.id} size="sm" />
            </motion.span>
          </span>
          <input
            ref={inputRef}
            id="add-name"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="add-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={showSuggestions ? `sugg-${highlight}` : undefined}
            autoComplete="off"
            enterKeyHint="done"
            className={cn(inputCls, 'h-14 pl-14 text-[17px] font-semibold')}
            placeholder="Spinach, paneer, eggs…"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPicked(undefined);
              setHighlight(0);
              setFocused(true);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            onKeyDown={onKeyDown}
          />
        </div>
        <AnimatePresence>
          {showSuggestions && (
            <motion.ul
              id="add-suggestions"
              role="listbox"
              aria-label="Suggestions"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[20px] border border-line bg-card p-1.5 shadow-float"
            >
              {suggestions.map((c, i) => (
                <li
                  key={c.id}
                  id={`sugg-${i}`}
                  role="option"
                  aria-selected={i === highlight}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] px-2 py-1.5',
                    i === highlight && 'bg-card-2',
                  )}
                >
                  <EmojiTile emoji={c.emoji} catalogueId={c.id} size="sm" />
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold">{c.name}</span>
                    <span className="block text-xs text-ink-2">
                      {c.category} · ~{c.shelfLifeDays[c.defaultLocation]} days in{' '}
                      {c.defaultLocation.toLowerCase()}
                    </span>
                  </span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {isCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-[18px] bg-soon-soft p-3 text-soon-ink">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="size-4" /> New item — not in our catalogue
              </p>
              <p className="mt-0.5 text-xs">
                We’ll guess a week in the fridge. Adjust the dates below. Pick an icon:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CUSTOM_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    aria-label={`Use ${em} icon`}
                    aria-pressed={emoji === em}
                    onClick={() => setEmoji(em)}
                    className={cn(
                      'grid size-11 place-items-center rounded-[14px] text-xl transition',
                      emoji === em ? 'bg-card shadow-card' : 'hover:bg-card/60',
                    )}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <span className={fieldLabel} id="qty-label">
          Quantity
        </span>
        <div className="flex gap-2">
          <Stepper
            value={qty}
            onChange={(q) => changeQty(q)}
            step={stepFor(unit, qty)}
            min={stepFor(unit, qty)}
            label="quantity"
            className="flex-1"
          />
          <select
            aria-label="Unit"
            value={unit}
            onChange={(e) => changeQty(qty, e.target.value as Unit)}
            className="h-[52px] w-[92px] rounded-full border border-line bg-card-2 px-4 text-[15px] font-semibold"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className={fieldLabel}>Where’s it going?</span>
        <Segmented<Location>
          id="add-loc"
          label="Location"
          value={location}
          onChange={changeLocation}
          options={LOCATIONS.map((l) => ({ value: l, label: l }))}
        />
      </div>

      <div className="grid grid-cols-[1fr_120px] gap-2">
        <div>
          <label htmlFor="add-expiry" className={fieldLabel}>
            Use by{' '}
            <span className="font-normal text-ink-3">· {daysLeftLabel(days).toLowerCase()}</span>
          </label>
          <input
            id="add-expiry"
            type="date"
            className={inputCls}
            value={expiresAt}
            onChange={(e) => {
              if (!e.target.value) return;
              setExpiresAt(e.target.value);
              setTouched((t) => ({ ...t, expiry: true }));
            }}
          />
        </div>
        <div>
          <label htmlFor="add-price" className={fieldLabel}>
            Price
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-2">
              {currency}
            </span>
            <input
              id="add-price"
              inputMode="decimal"
              className={cn(inputCls, 'pl-8')}
              placeholder="0"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value.replace(/[^0-9.]/g, ''));
                setTouched((t) => ({ ...t, price: true }));
              }}
            />
          </div>
        </div>
      </div>
      <div
        className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
        aria-label="Quick expiry"
      >
        {[
          ['Tomorrow', 1],
          ['3 days', 3],
          ['1 week', 7],
          ['2 weeks', 14],
          ['1 month', 30],
        ].map(([label, d]) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setExpiresAt(addDaysISO(d as number));
              setTouched((t) => ({ ...t, expiry: true }));
            }}
            className={cn(
              'h-9 shrink-0 rounded-full border px-3 text-[13px] font-semibold transition-colors',
              days === d
                ? 'border-transparent bg-ink text-bg'
                : 'border-line text-ink-2 hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={!name.trim()}>
        <Plus className="size-5" strokeWidth={2.6} /> Add to {location.toLowerCase()}
        {price && (
          <span className="font-medium opacity-80">
            · {formatMoney(parseFloat(price) || 0, currency)}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {added.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-1">
            <p className="mb-2 text-xs font-bold tracking-wider text-ink-3 uppercase">
              Added just now
            </p>
            <ul className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false}>
                {added.map((a) => (
                  <motion.li
                    key={a.id}
                    layout
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                    className="flex items-center gap-1.5 rounded-full bg-brand-soft py-1 pr-3 pl-1.5 text-sm font-semibold text-brand-soft-ink"
                  >
                    <span aria-hidden>{a.emoji}</span>
                    {a.name}
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

interface ReviewRow extends BulkRow {
  key: string;
  location: Location;
}

function BulkAdd({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ReviewRow[] | null>(null);

  const preview = useMemo(() => parseBulk(text), [text]);

  const review = () => {
    setRows(
      preview.map((r, i) => ({
        ...r,
        key: `${i}-${r.raw}`,
        location: r.match?.defaultLocation ?? 'Fridge',
      })),
    );
  };

  const valid = rows?.filter((r) => !r.error) ?? [];

  const addAll = () => {
    if (!valid.length) return;
    const created = useLarder.getState().addItems(
      valid.map((r) =>
        draftItem({
          name: r.name,
          catalogueId: r.match?.id,
          location: r.location,
          quantity: r.quantity,
          unit: r.unit,
          price: r.match ? typicalPriceFor(r.match, r.quantity, r.unit) : undefined,
        }),
      ),
    );
    toast({
      title: `Added ${created.length} ${created.length === 1 ? 'item' : 'items'}`,
      description:
        created
          .slice(0, 4)
          .map((c) => c.emoji)
          .join(' ') + (created.length > 4 ? ' …' : ''),
      emoji: '🧺',
      action: { label: 'Undo', onClick: undo },
    });
    onDone();
  };

  if (!rows) {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="bulk-text" className={fieldLabel}>
            Type or paste everything you bought
          </label>
          <textarea
            id="bulk-text"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'2 milk, spinach, 6 eggs, chicken thighs\n500g paneer\n1 kg tomatoes'}
            className={cn(inputCls, 'h-auto resize-none py-3 leading-relaxed')}
          />
          <p className="mt-1.5 text-xs text-ink-3">
            Commas or new lines. Quantities like “2”, “500g” or “a dozen” work.
          </p>
        </div>
        <AnimatePresence>
          {preview.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap gap-1.5"
              aria-live="polite"
            >
              {preview.map((r, i) => (
                <motion.span
                  key={`${i}-${r.raw}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold',
                    r.error
                      ? 'bg-expired-soft text-expired-ink'
                      : r.match
                        ? 'bg-card-2'
                        : 'bg-soon-soft text-soon-ink',
                  )}
                >
                  <span aria-hidden>{r.match?.emoji ?? (r.error ? '⚠️' : '🛒')}</span>
                  {r.error ? r.raw : r.name}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <Button size="lg" className="w-full" disabled={!preview.length} onClick={review}>
          <ListPlus className="size-5" /> Review {preview.length || ''}{' '}
          {preview.length === 1 ? 'item' : 'items'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setRows(null)}
        className="flex h-10 items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Edit list
      </button>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <motion.li
              key={r.key}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.035 } }}
              exit={{ opacity: 0, x: -40, height: 0 }}
              className={cn(
                'rounded-[20px] border p-2.5',
                r.error ? 'border-expired/30 bg-expired-soft' : 'border-line bg-card-2/60',
              )}
            >
              <div className="flex items-center gap-2.5">
                <EmojiTile
                  emoji={r.match?.emoji ?? (r.error ? '⚠️' : '🛒')}
                  catalogueId={r.match?.id}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{r.error ? r.raw : r.name}</p>
                  <p
                    className={cn('truncate text-xs', r.error ? 'text-expired-ink' : 'text-ink-2')}
                  >
                    {r.error
                      ? r.error
                      : r.match
                        ? r.confidence >= 0.9
                          ? `Matched · ${formatQty(r.quantity, r.unit)}`
                          : `Best guess for “${r.raw}” · ${formatQty(r.quantity, r.unit)}`
                        : `New item · ${formatQty(r.quantity, r.unit)} · 7 days`}
                  </p>
                </div>
                {!r.error && r.match && r.confidence < 0.9 && (
                  <span className="rounded-full bg-soon-soft px-2 py-0.5 text-[11px] font-bold text-soon-ink">
                    Check
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${r.name}`}
                  onClick={() => setRows((rs) => rs?.filter((x) => x.key !== r.key) ?? null)}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-card hover:text-expired-ink"
                >
                  <Trash2 className="size-[18px]" />
                </button>
              </div>
              {!r.error && (
                <div className="mt-2 flex items-center gap-2">
                  <Stepper
                    size="sm"
                    value={r.quantity}
                    onChange={(q) =>
                      setRows(
                        (rs) =>
                          rs?.map((x) => (x.key === r.key ? { ...x, quantity: q } : x)) ?? null,
                      )
                    }
                    step={stepFor(r.unit, r.quantity)}
                    min={stepFor(r.unit, r.quantity)}
                    suffix={r.unit === 'pcs' ? '' : r.unit}
                    label={`${r.name} quantity`}
                    className="flex-1"
                  />
                  <select
                    aria-label={`${r.name} location`}
                    value={r.location}
                    onChange={(e) =>
                      setRows(
                        (rs) =>
                          rs?.map((x) =>
                            x.key === r.key ? { ...x, location: e.target.value as Location } : x,
                          ) ?? null,
                      )
                    }
                    className="h-11 rounded-full border border-line bg-card px-3 text-sm font-semibold"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {rows.some((r) => r.error) && (
        <p className="text-xs text-expired-ink">Rows with problems will be skipped.</p>
      )}
      <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-card via-card to-transparent px-5 pt-4">
        <Button size="lg" className="w-full" disabled={!valid.length} onClick={addAll}>
          <Check className="size-5" strokeWidth={2.6} /> Add all {valid.length}{' '}
          {valid.length === 1 ? 'item' : 'items'}
        </Button>
      </div>
    </div>
  );
}

export function AddSheet({
  open,
  onClose,
  initialMode = 'quick',
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: 'quick' | 'bulk';
}) {
  const [mode, setMode] = useState<'quick' | 'bulk'>(initialMode);
  const [session, setSession] = useState(0);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setSession((s) => s + 1);
    }
  }, [open, initialMode]);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Add groceries"
      description="Smart defaults fill in the rest."
      size="md"
    >
      <Tabs.Root value={mode} onValueChange={(v) => setMode(v as 'quick' | 'bulk')}>
        <Tabs.List aria-label="Add mode" className="mb-5 flex rounded-full bg-card-2 p-1">
          {(
            [
              ['quick', 'Quick add', Zap],
              ['bulk', 'Just shopped', ListPlus],
            ] as const
          ).map(([v, label, Icon]) => (
            <Tabs.Trigger
              key={v}
              value={v}
              className={cn(
                'relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors',
                mode === v ? 'text-ink' : 'text-ink-2',
              )}
            >
              {mode === v && (
                <motion.span
                  layoutId="add-tab"
                  className="absolute inset-0 rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-6px_rgb(0_0_0/0.18)] dark:bg-card-3"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{label}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="quick" className="outline-none">
          <QuickAdd key={`q${session}`} />
        </Tabs.Content>
        <Tabs.Content value="bulk" className="outline-none">
          <BulkAdd key={`b${session}`} onDone={onClose} />
        </Tabs.Content>
      </Tabs.Root>
    </Sheet>
  );
}
