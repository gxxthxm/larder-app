import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLarder } from '@/store/useLarder';
import { exitDirection, useUI } from '@/store/useUI';
import { toast } from '@/store/useToasts';
import type { Item, TossReason } from '@/lib/types';
import { TOSS_REASONS } from '@/lib/types';
import { canFreeze } from '@/lib/catalogue';
import { daysLeft, formatDate } from '@/lib/dates';
import { formatQty, stepFor, tidy } from '@/lib/units';
import { formatMoney } from '@/lib/utils';
import { tick } from '@/lib/haptics';
import { Sheet } from './ui/sheet';
import { Stepper } from './ui/stepper';
import { Button } from './ui/button';
import { EmojiTile } from './EmojiTile';

function undoToast() {
  const label = useLarder.getState().undo();
  if (label) toast({ title: 'Undone', emoji: '↩️', duration: 2200 });
}

export function useItemActions() {
  const openAction = useUI((s) => s.openAction);

  return {
    /** Swipe path: use all of it right away. */
    useAll(item: Item) {
      exitDirection.set(item.id, 'right');
      const ev = useLarder.getState().markUsed(item.id);
      tick(12);
      if (ev) announceUsed(ev.itemName, ev.value, ev.emoji);
    },
    openUse(item: Item) {
      openAction('use', item.id);
    },
    openToss(item: Item) {
      openAction('toss', item.id);
    },
    freeze(item: Item) {
      if (!canFreeze(item.catalogueId) || item.location === 'Freezer' || daysLeft(item) < 0) return;
      exitDirection.set(item.id, 'up');
      const until = useLarder.getState().freezeItem(item.id);
      tick(10);
      if (until)
        toast({
          title: `Froze ${item.name}`,
          description: `Good till ${formatDate(until, 'd MMM yyyy')}`,
          emoji: '❄️',
          action: { label: 'Undo', onClick: undoToast },
        });
    },
  };
}

function announceUsed(name: string, value: number, emoji?: string) {
  const currency = useLarder.getState().settings.currency;
  toast({
    title: `Used ${name}`,
    description: value > 0 ? `Nice — ${formatMoney(value, currency)} not wasted` : 'Logged',
    emoji: emoji ?? '✅',
    action: { label: 'Undo', onClick: undoToast },
  });
}

function UseSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const [qty, setQty] = useState(item.quantity);
  const currency = useLarder((s) => s.settings.currency);
  const step = stepFor(item.unit, item.quantity);
  const value = item.price ? Math.round((item.price * qty) / item.quantity) : 0;
  const all = tidy(qty) >= tidy(item.quantity);

  const confirm = () => {
    exitDirection.set(item.id, 'right');
    const ev = useLarder.getState().markUsed(item.id, qty);
    tick(12);
    onClose();
    if (ev) announceUsed(ev.itemName, ev.value, ev.emoji);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <EmojiTile emoji={item.emoji} catalogueId={item.catalogueId} size="lg" />
        <div>
          <p className="font-display text-lg font-semibold">{item.name}</p>
          <p className="text-sm text-ink-2">You have {formatQty(item.quantity, item.unit)}</p>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">How much did you use?</span>
          <button
            type="button"
            onClick={() => setQty(item.quantity)}
            className="h-9 rounded-full px-3 text-[13px] font-semibold text-brand-soft-ink aria-pressed:bg-brand-soft"
            aria-pressed={all}
          >
            All of it
          </button>
        </div>
        <Stepper
          value={qty}
          onChange={setQty}
          step={step}
          min={step}
          max={item.quantity}
          suffix={item.unit === 'pcs' ? '' : item.unit}
          label="quantity used"
        />
      </div>
      <Button size="lg" className="w-full" onClick={confirm}>
        {all ? 'Used it all' : `Used ${formatQty(qty, item.unit)}`}
        {value > 0 && (
          <span className="font-medium opacity-80">· {formatMoney(value, currency)}</span>
        )}
      </Button>
    </div>
  );
}

function TossSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const [partial, setPartial] = useState(false);
  const [qty, setQty] = useState(item.quantity);
  const step = stepFor(item.unit, item.quantity);

  const toss = (reason: TossReason) => {
    exitDirection.set(item.id, 'left');
    useLarder.getState().tossItem(item.id, reason, partial ? qty : item.quantity);
    tick(10);
    onClose();
    toast({
      title: 'Logged. Happens to everyone.',
      description: `${item.name} · ${TOSS_REASONS.find((r) => r.id === reason)?.label}`,
      emoji: '🫶',
      action: { label: 'Undo', onClick: undoToast },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        {TOSS_REASONS.map((r, i) => (
          <motion.button
            key={r.id}
            type="button"
            onClick={() => toss(r.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
            whileTap={{ scale: 0.95 }}
            className="flex min-h-[88px] flex-col items-start justify-between rounded-[20px] bg-card-2 p-3.5 text-left transition-colors hover:bg-card-3"
          >
            <span className="text-2xl" aria-hidden>
              {r.emoji}
            </span>
            <span className="text-[15px] font-semibold">{r.label}</span>
          </motion.button>
        ))}
      </div>
      {item.quantity > step && (
        <div className="rounded-[20px] border border-line p-3">
          <button
            type="button"
            onClick={() => setPartial((p) => !p)}
            className="flex h-11 w-full items-center justify-between text-sm font-semibold"
            aria-expanded={partial}
          >
            Only tossing part of it?
            <span className="text-ink-2">{partial ? formatQty(qty, item.unit) : 'All'}</span>
          </button>
          {partial && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden pt-2"
            >
              <Stepper
                value={qty}
                onChange={setQty}
                step={step}
                min={step}
                max={item.quantity}
                suffix={item.unit === 'pcs' ? '' : item.unit}
                label="quantity tossed"
              />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

/** Mounted once; opened from any row via the UI store. */
export function ItemActionSheets() {
  const sheet = useUI((s) => s.actionSheet);
  const close = useUI((s) => s.closeAction);
  const item = useLarder((s) => (sheet ? s.items.find((i) => i.id === sheet.itemId) : undefined));
  const [last, setLast] = useState<{ kind: 'use' | 'toss'; item: Item } | null>(null);

  useEffect(() => {
    if (sheet && item) setLast({ kind: sheet.kind, item });
  }, [sheet, item]);

  const open = !!sheet && !!item;
  const shown = last;
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => !v && close()}
      size="sm"
      title={shown?.kind === 'toss' ? `Toss ${shown.item.name}?` : 'Mark as used'}
      description={shown?.kind === 'toss' ? 'What happened? One tap logs it.' : undefined}
    >
      {shown &&
        open &&
        (shown.kind === 'use' ? (
          <UseSheet key={shown.item.id} item={shown.item} onClose={close} />
        ) : (
          <TossSheet key={shown.item.id} item={shown.item} onClose={close} />
        ))}
    </Sheet>
  );
}
