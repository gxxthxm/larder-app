import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Item, ItemEvent, Location, Settings, TossReason } from '@/lib/types';
import { seedEvents, seedItems } from '@/data/seed';
import { canFreeze, defaultExpiry, getCatalogueItem, shelfLifeFor } from '@/lib/catalogue';
import { addDaysISO } from '@/lib/dates';
import { tidy } from '@/lib/units';
import { uid } from '@/lib/utils';

interface Snapshot {
  label: string;
  items: Item[];
  events: ItemEvent[];
}

export interface Consumption {
  itemId: string;
  quantity: number;
}

interface LarderState {
  items: Item[];
  events: ItemEvent[];
  settings: Settings;
  /** Not persisted: snapshots for the undo toast. */
  history: Snapshot[];

  addItems: (items: Omit<Item, 'id'>[]) => Item[];
  updateItem: (id: string, patch: Partial<Omit<Item, 'id'>>) => void;
  deleteItem: (id: string) => void;
  markUsed: (id: string, quantity?: number) => ItemEvent | undefined;
  tossItem: (id: string, reason: TossReason, quantity?: number) => ItemEvent | undefined;
  freezeItem: (id: string) => string | undefined;
  moveItem: (id: string, location: Location) => void;
  cook: (consumptions: Consumption[]) => ItemEvent[];
  undo: () => string | undefined;

  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  currency: '₹',
  theme: 'system',
  bannerDismissed: false,
  celebrated: false,
};

function valueOf(item: Item, quantity: number): number {
  if (!item.price || item.quantity <= 0) return 0;
  return Math.round((item.price * Math.min(quantity, item.quantity)) / item.quantity);
}

/** Remove `quantity` from an item, logging a 'used' or 'tossed' event. */
function consume(
  items: Item[],
  id: string,
  quantity: number,
  type: ItemEvent['type'],
  reason?: TossReason,
): { items: Item[]; event?: ItemEvent } {
  const item = items.find((i) => i.id === id);
  if (!item) return { items };
  const qty = Math.min(Math.max(quantity, 0), item.quantity);
  if (qty <= 0) return { items };
  const value = valueOf(item, qty);
  const event: ItemEvent = {
    id: uid('ev'),
    itemName: item.name,
    catalogueId: item.catalogueId,
    emoji: item.emoji,
    type,
    quantity: tidy(qty),
    unit: item.unit,
    value,
    reason,
    at: new Date().toISOString(),
    expiresAt: item.expiresAt,
  };
  const remaining = tidy(item.quantity - qty);
  const next =
    remaining <= 0
      ? items.filter((i) => i.id !== id)
      : items.map((i) =>
          i.id === id
            ? { ...i, quantity: remaining, price: i.price ? Math.max(0, i.price - value) : i.price }
            : i,
        );
  return { items: next, event };
}

function expiryForMove(item: Item, location: Location): string {
  const c = getCatalogueItem(item.catalogueId);
  const life = shelfLifeFor(c, location);
  return life !== undefined ? addDaysISO(life) : item.expiresAt;
}

export const useLarder = create<LarderState>()(
  persist(
    (set, get) => {
      const snap = (label: string): Snapshot => ({
        label,
        items: get().items,
        events: get().events,
      });
      const pushHistory = (s: Snapshot) => [...get().history.slice(-19), s];

      return {
        items: seedItems(),
        events: seedEvents(),
        settings: DEFAULT_SETTINGS,
        history: [],

        addItems: (newItems) => {
          const created = newItems.map((i) => ({ ...i, id: uid('item') }));
          set({ history: pushHistory(snap('add')), items: [...created, ...get().items] });
          return created;
        },

        updateItem: (id, patch) => {
          set({
            history: pushHistory(snap('edit')),
            items: get().items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          });
        },

        deleteItem: (id) => {
          set({
            history: pushHistory(snap('delete')),
            items: get().items.filter((i) => i.id !== id),
          });
        },

        markUsed: (id, quantity) => {
          const item = get().items.find((i) => i.id === id);
          if (!item) return undefined;
          const s = snap('used');
          const { items, event } = consume(get().items, id, quantity ?? item.quantity, 'used');
          if (!event) return undefined;
          set({ history: pushHistory(s), items, events: [event, ...get().events] });
          return event;
        },

        tossItem: (id, reason, quantity) => {
          const item = get().items.find((i) => i.id === id);
          if (!item) return undefined;
          const s = snap('tossed');
          const { items, event } = consume(
            get().items,
            id,
            quantity ?? item.quantity,
            'tossed',
            reason,
          );
          if (!event) return undefined;
          set({ history: pushHistory(s), items, events: [event, ...get().events] });
          return event;
        },

        freezeItem: (id) => {
          const item = get().items.find((i) => i.id === id);
          if (!item || item.location === 'Freezer' || !canFreeze(item.catalogueId))
            return undefined;
          const expiresAt = expiryForMove(item, 'Freezer');
          set({
            history: pushHistory(snap('frozen')),
            items: get().items.map((i) =>
              i.id === id ? { ...i, location: 'Freezer', expiresAt } : i,
            ),
          });
          return expiresAt;
        },

        moveItem: (id, location) => {
          const item = get().items.find((i) => i.id === id);
          if (!item || item.location === location) return;
          const expiresAt = expiryForMove(item, location);
          set({
            history: pushHistory(snap('moved')),
            items: get().items.map((i) => (i.id === id ? { ...i, location, expiresAt } : i)),
          });
        },

        cook: (consumptions) => {
          const s = snap('cooked');
          let items = get().items;
          const events: ItemEvent[] = [];
          for (const c of consumptions) {
            const r = consume(items, c.itemId, c.quantity, 'used');
            items = r.items;
            if (r.event) events.push(r.event);
          }
          set({ history: pushHistory(s), items, events: [...events, ...get().events] });
          return events;
        },

        undo: () => {
          const h = get().history;
          const last = h[h.length - 1];
          if (!last) return undefined;
          set({ items: last.items, events: last.events, history: h.slice(0, -1) });
          return last.label;
        },

        updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

        resetDemo: () =>
          set({
            items: seedItems(),
            events: seedEvents(),
            history: [],
            settings: { ...get().settings, bannerDismissed: false, celebrated: false },
          }),

        clearAll: () =>
          set({
            items: [],
            events: [],
            history: [],
            settings: { ...get().settings, bannerDismissed: true },
          }),
      };
    },
    {
      name: 'larder.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, events: s.events, settings: s.settings }),
    },
  ),
);

/** Build a new item from a catalogue entry or a custom name. */
export function draftItem(input: {
  name: string;
  catalogueId?: string;
  emoji?: string;
  location?: Location;
  quantity?: number;
  unit?: Item['unit'];
  price?: number;
  expiresAt?: string;
}): Omit<Item, 'id'> {
  const c = getCatalogueItem(input.catalogueId);
  const location = input.location ?? c?.defaultLocation ?? 'Fridge';
  return {
    catalogueId: c?.id,
    name: input.name.trim() || c?.name || 'Item',
    emoji: input.emoji ?? c?.emoji ?? '🛒',
    location,
    quantity: input.quantity ?? 1,
    unit: input.unit ?? c?.defaultUnit ?? 'pcs',
    price: input.price,
    addedAt: addDaysISO(0),
    expiresAt: input.expiresAt ?? defaultExpiry(c, location),
  };
}
