import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import type { Item } from './types';

export type Band = 'expired' | 'today' | 'soon' | 'week' | 'later';

export const BANDS: { id: Band; label: string; hint: string }[] = [
  { id: 'expired', label: 'Expired', hint: 'Check before using' },
  { id: 'today', label: 'Today', hint: 'Use these tonight' },
  { id: 'soon', label: '1–2 days', hint: 'Plan them in' },
  { id: 'week', label: '3–5 days', hint: 'This week' },
  { id: 'later', label: 'Later', hint: 'Plenty of time' },
];

/** Local calendar date as yyyy-MM-dd. */
export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function addDaysISO(days: number, from: Date = new Date()): string {
  return toISODate(addDays(startOfDay(from), days));
}

export function daysUntil(isoDate: string, today: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(isoDate), startOfDay(today));
}

export function daysLeft(item: Pick<Item, 'expiresAt'>, today: Date = new Date()): number {
  return daysUntil(item.expiresAt, today);
}

export function bandFor(days: number): Band {
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= 2) return 'soon';
  if (days <= 5) return 'week';
  return 'later';
}

export function bandLabel(band: Band): string {
  return BANDS.find((b) => b.id === band)?.label ?? band;
}

/** Short, friendly status shown next to every item. */
export function daysLeftLabel(days: number): string {
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Use me today';
  if (days === 1) return 'Use by tomorrow';
  if (days <= 5) return `${days} days left`;
  if (days <= 9) return 'Still good for a week';
  if (days <= 20) return `${days} days left`;
  if (days <= 60) return `Good for ${Math.round(days / 7)} weeks`;
  return `Good for ${Math.round(days / 30)} months`;
}

/** Compact version for tight chips. */
export function daysLeftShort(days: number): string {
  if (days < 0) return `${-days}d ago`;
  if (days === 0) return 'Today';
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

export function formatDate(iso: string, pattern = 'd MMM'): string {
  return format(parseISO(iso), pattern);
}
