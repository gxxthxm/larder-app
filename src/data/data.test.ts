import { describe, expect, it } from 'vitest';
import { catalogue, getCatalogueItem } from '@/lib/catalogue';
import { recipes } from './recipes';
import { seedEvents, seedItems } from './seed';
import { bandFor, daysLeft } from '@/lib/dates';
import { rankRecipes } from '@/lib/scoring';
import { mostWasted, topTossReason, weeklySeries } from '@/lib/impact';

const now = new Date(2026, 9, 22, 19);

describe('bundled data', () => {
  it('has ~150 catalogue items and ~40 recipes', () => {
    expect(catalogue.length).toBeGreaterThanOrEqual(140);
    expect(recipes.length).toBeGreaterThanOrEqual(40);
  });

  it('references only real catalogue ids', () => {
    for (const r of recipes)
      for (const i of r.ingredients)
        expect(getCatalogueItem(i.catalogueId), `${r.id}:${i.catalogueId}`).toBeDefined();
  });
});

describe('seed', () => {
  const items = seedItems(now);

  it('has 35 items split 18 / 7 / 10', () => {
    expect(items).toHaveLength(35);
    expect(items.filter((i) => i.location === 'Fridge')).toHaveLength(18);
    expect(items.filter((i) => i.location === 'Freezer')).toHaveLength(7);
    expect(items.filter((i) => i.location === 'Pantry')).toHaveLength(10);
  });

  it('has the agreed urgency mix', () => {
    const count = (b: string) => items.filter((i) => bandFor(daysLeft(i, now)) === b).length;
    expect(count('expired')).toBe(2);
    expect(count('today')).toBe(3);
    expect(count('soon')).toBe(5);
    expect(count('week')).toBe(6);
    expect(count('later')).toBe(19);
  });

  it('lets at least 3 recipes use today items with nothing missing', () => {
    const todayIds = new Set(items.filter((i) => daysLeft(i, now) === 0).map((i) => i.catalogueId));
    const ok = rankRecipes(recipes, items, now).filter(
      (s) =>
        s.missing.length === 0 && s.owned.some((o) => o.item && todayIds.has(o.item.catalogueId)),
    );
    expect(ok.length).toBeGreaterThanOrEqual(3);
  });

  it('generates ~70 events with a falling waste trend', () => {
    const events = seedEvents(now);
    expect(events.length).toBeGreaterThanOrEqual(65);
    expect(events.length).toBeLessThanOrEqual(75);
    const weeks = weeklySeries(events, now);
    const firstHalf = weeks.slice(0, 4).reduce((s, w) => s + w.tossed, 0);
    const secondHalf = weeks.slice(4).reduce((s, w) => s + w.tossed, 0);
    expect(secondHalf).toBeLessThan(firstHalf);
    expect(topTossReason(events)?.reason).toBe('Forgot');
    expect(mostWasted(events, 2).map((w) => w.name)).toEqual(['Spinach', 'Coriander']);
  });
});
