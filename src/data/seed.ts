import { addHours, setHours, setMinutes, startOfDay, subDays } from 'date-fns';
import type { Item, ItemEvent, Location, TossReason, Unit } from '@/lib/types';
import { getCatalogueItem } from '@/lib/catalogue';
import { addDaysISO } from '@/lib/dates';
import { prng } from '@/lib/utils';

/** [catalogueId, location, daysLeft, quantity, unit?, price?] */
type SeedRow = [string, Location, number, number, Unit?, number?];

/**
 * 35 items: Fridge 18, Freezer 7, Pantry 10.
 * Urgency mix: 2 expired, 3 today, 5 in 1–2 days, 6 in 3–5 days, 19 later.
 * Today's items (spinach, paneer, tomatoes) power palak paneer, paneer bhurji,
 * kadai paneer, tomato rice and more with nothing missing.
 */
export const SEED_ROWS: SeedRow[] = [
  // Fridge (18)
  ['coriander', 'Fridge', -1, 1],
  ['buttermilk', 'Fridge', -2, 2],
  ['spinach', 'Fridge', 0, 1],
  ['paneer', 'Fridge', 0, 1],
  ['tomato', 'Fridge', 0, 1, 'kg'],
  ['chicken-thighs', 'Fridge', 1, 1],
  ['milk', 'Fridge', 1, 1, 'l'],
  ['mushroom', 'Fridge', 2, 1],
  ['capsicum', 'Fridge', 2, 3],
  ['curd', 'Fridge', 3, 1],
  ['cucumber', 'Fridge', 4, 2],
  ['cream', 'Fridge', 4, 1],
  ['green-chilli', 'Fridge', 5, 1],
  ['carrot', 'Fridge', 9, 0.5, 'kg'],
  ['lemon', 'Fridge', 10, 4],
  ['eggs', 'Fridge', 12, 10],
  ['ginger', 'Fridge', 14, 1],
  ['butter', 'Fridge', 25, 1],
  // Freezer (7)
  ['prawns', 'Freezer', 45, 1],
  ['frozen-momos', 'Freezer', 60, 1],
  ['ice-cream', 'Freezer', 70, 1],
  ['frozen-paratha', 'Freezer', 90, 1],
  ['frozen-mixed-veg', 'Freezer', 120, 1],
  ['frozen-peas', 'Freezer', 150, 1],
  ['frozen-corn', 'Freezer', 200, 1],
  // Pantry (10)
  ['bread', 'Pantry', 2, 1],
  ['banana', 'Pantry', 3, 6],
  ['pav', 'Pantry', 5, 1],
  ['onion', 'Pantry', 18, 2, 'kg'],
  ['potato', 'Pantry', 20, 1.5, 'kg'],
  ['garlic', 'Pantry', 30, 3],
  ['atta', 'Pantry', 80, 5, 'kg'],
  ['rice', 'Pantry', 200, 5, 'kg'],
  ['toor-dal', 'Pantry', 250, 1, 'kg'],
  ['pasta', 'Pantry', 300, 2],
];

export function seedItems(now: Date = new Date()): Item[] {
  return SEED_ROWS.map(([id, location, days, quantity, unit], i) => {
    const c = getCatalogueItem(id);
    if (!c) throw new Error(`Seed item ${id} missing from catalogue`);
    const life = c.shelfLifeDays[location] ?? days + 3;
    const addedAgo = Math.max(0, Math.min(life - days, 14));
    return {
      id: `seed_${i}_${id}`,
      catalogueId: id,
      name: c.name,
      emoji: c.emoji,
      location,
      quantity,
      unit: unit ?? c.defaultUnit,
      price: Math.round(c.typicalPrice * quantity),
      addedAt: addDaysISO(-addedAgo, now),
      expiresAt: addDaysISO(days, now),
    };
  });
}

/** [catalogueId, reason] — spinach and coriander lead, "Forgot" is the top reason. */
const TOSSES: [string, TossReason][] = [
  ['spinach', 'Forgot'],
  ['coriander', 'Forgot'],
  ['bread', 'WentOffEarly'],
  ['spinach', 'TooMuch'],
  ['coriander', 'Forgot'],
  ['banana', 'Forgot'],
  ['mint', 'Forgot'],
  ['spinach', 'Forgot'],
  ['bottle-gourd', 'DidntLike'],
  ['milk', 'WentOffEarly'],
  ['coriander', 'WentOffEarly'],
  ['curd', 'Forgot'],
  ['spinach', 'WentOffEarly'],
  ['tomato', 'TooMuch'],
  ['methi', 'DidntLike'],
  ['coriander', 'Forgot'],
  ['mushroom', 'Forgot'],
  ['banana', 'TooMuch'],
  ['spinach', 'Forgot'],
  ['bread', 'Forgot'],
];

const USED_POOL: [string, number][] = [
  ['paneer', 1],
  ['eggs', 6],
  ['chicken-thighs', 1],
  ['milk', 1],
  ['curd', 1],
  ['tomato', 0.5],
  ['onion', 0.5],
  ['potato', 0.5],
  ['rice', 0.5],
  ['toor-dal', 0.3],
  ['bread', 1],
  ['spinach', 1],
  ['capsicum', 2],
  ['carrot', 0.5],
  ['banana', 4],
  ['apple', 3],
  ['butter', 0.5],
  ['prawns', 1],
  ['mushroom', 1],
  ['atta', 1],
  ['cream', 1],
  ['cauliflower', 1],
  ['coriander', 1],
  ['okra', 0.5],
  ['fish-fillet', 1],
  ['mango', 2],
  ['cheese-slices', 0.5],
  ['pasta', 1],
  ['green-peas', 0.5],
];

/** Tosses per week, oldest → newest: a falling waste trend. */
const TOSSES_PER_WEEK = [4, 4, 3, 3, 2, 2, 1, 1];
const USED_PER_WEEK = [5, 6, 6, 6, 7, 7, 7, 6];

function eventTime(now: Date, ago: number, rand: () => number): Date {
  if (ago === 0) {
    const t = addHours(now, -1 - Math.floor(rand() * 2));
    return t < startOfDay(now) ? addHours(startOfDay(now), 0.1) : t;
  }
  const day = subDays(startOfDay(now), ago);
  return setMinutes(setHours(day, 8 + Math.floor(rand() * 13)), Math.floor(rand() * 60));
}

export function seedEvents(now: Date = new Date()): ItemEvent[] {
  const rand = prng(20261022);
  const events: ItemEvent[] = [];
  let toss = 0;
  let used = 0;

  for (let w = 0; w < 8; w++) {
    const weeksAgo = 7 - w;
    const baseAgo = weeksAgo * 7;

    for (let k = 0; k < TOSSES_PER_WEEK[w]; k++) {
      const [id, reason] = TOSSES[toss++ % TOSSES.length];
      const c = getCatalogueItem(id)!;
      const ago = baseAgo + 1 + Math.floor(rand() * 6);
      const at = eventTime(now, ago, rand);
      events.push({
        id: `seed_ev_t${toss}`,
        itemName: c.name,
        catalogueId: id,
        emoji: c.emoji,
        type: 'tossed',
        quantity: 1,
        unit: c.defaultUnit,
        value: Math.round(c.typicalPrice * (c.defaultUnit === 'kg' ? 0.5 : 1)),
        reason,
        at: at.toISOString(),
        expiresAt: addDaysISO(-1 - Math.floor(rand() * 2), at),
      });
    }

    for (let k = 0; k < USED_PER_WEEK[w]; k++) {
      const [id, qty] = USED_POOL[Math.floor(rand() * USED_POOL.length)];
      const c = getCatalogueItem(id)!;
      // Two uses "today" so this month's savings are never empty.
      const ago = weeksAgo === 0 && k < 2 ? 0 : baseAgo + Math.floor(rand() * 7);
      const at = eventTime(now, ago, rand);
      const late = rand() < 0.08; // a few used after expiry don't count as saved
      events.push({
        id: `seed_ev_u${++used}`,
        itemName: c.name,
        catalogueId: id,
        emoji: c.emoji,
        type: 'used',
        quantity: qty,
        unit: c.defaultUnit,
        value: Math.round(c.typicalPrice * qty),
        at: at.toISOString(),
        expiresAt: addDaysISO(late ? -1 : 1 + Math.floor(rand() * 4), at),
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}
