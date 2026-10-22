import catalogueData from '@/data/catalogue.json';
import type { CatalogueItem, Location, Unit } from './types';
import { addDaysISO } from './dates';
import { convert } from './units';

export const catalogue = catalogueData as CatalogueItem[];
const byId = new Map(catalogue.map((c) => [c.id, c]));

export const PANTRY_STAPLES = new Set(['salt', 'oil', 'black-pepper', 'water']);

export function getCatalogueItem(id: string | undefined): CatalogueItem | undefined {
  return id ? byId.get(id) : undefined;
}

export const CUSTOM_SHELF_LIFE: Record<Location, number> = { Fridge: 7, Freezer: 30, Pantry: 30 };

export function shelfLifeFor(c: CatalogueItem | undefined, location: Location): number | undefined {
  if (!c) return CUSTOM_SHELF_LIFE[location];
  return c.shelfLifeDays[location];
}

export function canFreeze(catalogueId: string | undefined): boolean {
  const c = getCatalogueItem(catalogueId);
  return !c || c.shelfLifeDays.Freezer !== undefined;
}

/** Expiry date for an item placed in a location today. Falls back to the closest known life. */
export function defaultExpiry(
  c: CatalogueItem | undefined,
  location: Location,
  from = new Date(),
): string {
  const life =
    shelfLifeFor(c, location) ?? (c ? c.shelfLifeDays[c.defaultLocation] : undefined) ?? 7;
  return addDaysISO(life, from);
}

/** Typical price for a quantity, converting to the catalogue's default unit when possible. */
export function typicalPriceFor(c: CatalogueItem, quantity: number, unit: Unit): number {
  const inDefault = convert(quantity, unit, c.defaultUnit);
  const units = inDefault ?? (unit === c.defaultUnit ? quantity : 1);
  return Math.round(c.typicalPrice * units);
}

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function singular(word: string): string {
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (word.endsWith('es') && /(ch|sh|x|s)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function names(c: CatalogueItem): string[] {
  return [c.name, c.id.replace(/-/g, ' '), ...(c.aliases ?? [])].map(normalise);
}

const index = catalogue.map((c) => ({ c, names: names(c) }));

/** Levenshtein similarity in [0, 1]. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

export interface Match {
  item: CatalogueItem;
  confidence: number;
}

/** Best catalogue match for a free-text name. */
export function matchCatalogue(query: string): Match | undefined {
  const q = normalise(query);
  if (!q) return undefined;
  const qs = q.split(' ').map(singular).join(' ');
  let best: Match | undefined;
  for (const { c, names: ns } of index) {
    for (const n of ns) {
      const ns1 = n.split(' ').map(singular).join(' ');
      let score = 0;
      if (n === q) score = 1;
      else if (ns1 === qs) score = 0.97;
      else if (ns1.startsWith(qs + ' ') || qs.startsWith(ns1 + ' ')) score = 0.85;
      else if (qs.length >= 4 && (ns1.includes(qs) || qs.includes(ns1))) score = 0.75;
      else {
        const sim = similarity(qs, ns1);
        if (sim >= 0.72) score = sim * 0.9;
      }
      if (score > (best?.confidence ?? 0)) best = { item: c, confidence: score };
    }
  }
  return best;
}

/** Autocomplete suggestions, best first. */
export function searchCatalogue(query: string, limit = 6): CatalogueItem[] {
  const q = normalise(query);
  if (!q) return [];
  const scored: { c: CatalogueItem; s: number }[] = [];
  for (const { c, names: ns } of index) {
    let s = 0;
    for (const n of ns) {
      if (n === q) s = Math.max(s, 100);
      else if (n.startsWith(q)) s = Math.max(s, 80 - n.length / 10);
      else if (n.split(' ').some((w) => w.startsWith(q))) s = Math.max(s, 60 - n.length / 10);
      else if (q.length >= 3 && n.includes(q)) s = Math.max(s, 40);
      else if (q.length >= 4) {
        const sim = similarity(q, n.slice(0, q.length + 1));
        if (sim >= 0.7) s = Math.max(s, sim * 30);
      }
    }
    if (s > 0) scored.push({ c, s: s + (n0(c) === q ? 5 : 0) });
  }
  return scored
    .sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name))
    .slice(0, limit)
    .map((x) => x.c);
}

function n0(c: CatalogueItem): string {
  return normalise(c.name);
}
