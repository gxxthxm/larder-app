import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import type { ItemEvent, TossReason } from './types';

function inRange(e: ItemEvent, from: Date, to: Date): boolean {
  const t = parseISO(e.at).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function usedBeforeExpiry(e: ItemEvent): boolean {
  if (!e.expiresAt) return true;
  return format(parseISO(e.at), 'yyyy-MM-dd') <= e.expiresAt;
}

/** Value of food used on or before its expiry, within [from, to]. */
export function moneySaved(events: ItemEvent[], from: Date, to: Date): number {
  return events
    .filter((e) => e.type === 'used' && inRange(e, from, to) && usedBeforeExpiry(e))
    .reduce((s, e) => s + e.value, 0);
}

export interface PeriodStats {
  saved: number;
  usedValue: number;
  tossedValue: number;
  itemsWasted: number;
  itemsUsed: number;
  /** tossed / (used + tossed), 0–1. */
  wasteRate: number;
}

export function periodStats(events: ItemEvent[], from: Date, to: Date): PeriodStats {
  const inPeriod = events.filter((e) => inRange(e, from, to));
  const used = inPeriod.filter((e) => e.type === 'used');
  const tossed = inPeriod.filter((e) => e.type === 'tossed');
  const usedValue = used.reduce((s, e) => s + e.value, 0);
  const tossedValue = tossed.reduce((s, e) => s + e.value, 0);
  const total = usedValue + tossedValue;
  return {
    saved: moneySaved(events, from, to),
    usedValue,
    tossedValue,
    itemsWasted: tossed.length,
    itemsUsed: used.length,
    wasteRate: total > 0 ? tossedValue / total : 0,
  };
}

export function monthStats(events: ItemEvent[], now: Date = new Date()): PeriodStats {
  return periodStats(events, startOfMonth(now), now);
}

export function wasteRate(events: ItemEvent[]): number {
  const used = events.filter((e) => e.type === 'used').reduce((s, e) => s + e.value, 0);
  const tossed = events.filter((e) => e.type === 'tossed').reduce((s, e) => s + e.value, 0);
  return used + tossed > 0 ? tossed / (used + tossed) : 0;
}

export interface WeekBucket {
  label: string;
  start: string;
  used: number;
  tossed: number;
}

/** Rolling 7-day buckets, oldest first, the last one ending today. */
export function weeklySeries(events: ItemEvent[], now: Date = new Date(), weeks = 8): WeekBucket[] {
  const today = startOfDay(now);
  const buckets: WeekBucket[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = subDays(today, w * 7 + 6);
    buckets.push({
      label: format(start, 'd MMM'),
      start: format(start, 'yyyy-MM-dd'),
      used: 0,
      tossed: 0,
    });
  }
  for (const e of events) {
    const ago = differenceInCalendarDays(today, parseISO(e.at));
    if (ago < 0 || ago >= weeks * 7) continue;
    const idx = weeks - 1 - Math.floor(ago / 7);
    buckets[idx][e.type === 'used' ? 'used' : 'tossed'] += e.value;
  }
  return buckets.map((b) => ({ ...b, used: Math.round(b.used), tossed: Math.round(b.tossed) }));
}

export interface WastedItem {
  name: string;
  emoji?: string;
  count: number;
  value: number;
}

export function mostWasted(events: ItemEvent[], limit = 5): WastedItem[] {
  const map = new Map<string, WastedItem>();
  for (const e of events) {
    if (e.type !== 'tossed') continue;
    const key = e.catalogueId ?? e.itemName.toLowerCase();
    const prev = map.get(key) ?? { name: e.itemName, emoji: e.emoji, count: 0, value: 0 };
    prev.count += 1;
    prev.value += e.value;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.value - a.value).slice(0, limit);
}

export function topTossReason(
  events: ItemEvent[],
): { reason: TossReason; count: number; share: number } | undefined {
  const counts = new Map<TossReason, number>();
  let total = 0;
  for (const e of events) {
    if (e.type !== 'tossed' || !e.reason) continue;
    counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
    total++;
  }
  let best: { reason: TossReason; count: number; share: number } | undefined;
  for (const [reason, count] of counts) {
    if (!best || count > best.count) best = { reason, count, share: count / total };
  }
  return best;
}

/** Days between the first event and today. */
export function dataSpanDays(events: ItemEvent[], now: Date = new Date()): number {
  if (!events.length) return 0;
  const first = events.reduce((min, e) => (e.at < min ? e.at : min), events[0].at);
  return differenceInCalendarDays(startOfDay(now), parseISO(first));
}

/** Friendly comparison for a saved amount (INR). */
export function savingsComparison(amount: number): string | undefined {
  if (amount >= 1500) return "that's a nice dinner out";
  if (amount >= 600) return "that's a week of veggies";
  if (amount >= 200) return "that's a pizza";
  if (amount >= 80) return "that's a fancy coffee";
  return undefined;
}
