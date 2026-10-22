import { describe, expect, it } from 'vitest';
import type { Item, Recipe } from './types';
import { filterRecipes, rankRecipes, scoreRecipe } from './scoring';
import { addDaysISO } from './dates';

const today = new Date(2026, 9, 22, 12);

function item(catalogueId: string, days: number): Item {
  return {
    id: `i_${catalogueId}_${days}`,
    catalogueId,
    name: catalogueId,
    emoji: '🥕',
    location: 'Fridge',
    quantity: 1,
    unit: 'pcs',
    addedAt: addDaysISO(-1, today),
    expiresAt: addDaysISO(days, today),
  };
}

function recipe(
  id: string,
  ingredients: [string, boolean?][],
  minutes = 20,
  tags: string[] = [],
): Recipe {
  return {
    id,
    title: id,
    emoji: '🍲',
    minutes,
    difficulty: 'Easy',
    tags,
    steps: [],
    ingredients: ingredients.map(([catalogueId, optional]) => ({
      catalogueId,
      amount: 1,
      unit: 'pcs',
      optional,
    })),
  };
}

describe('scoreRecipe', () => {
  it('weights owned ingredients by urgency', () => {
    const r = recipe('r', [['spinach'], ['paneer'], ['onion']]);
    const s = scoreRecipe(r, [item('spinach', 0), item('paneer', 4), item('onion', 20)], today);
    expect(s.score).toBe(10 + 5 + 1);
    expect(s.missing).toHaveLength(0);
    expect(s.urgentCount).toBe(1);
    expect(s.expiring.map((o) => o.ingredient.catalogueId)).toEqual(['spinach', 'paneer']);
  });

  it('treats 2 days as urgent and 3 as this week', () => {
    expect(scoreRecipe(recipe('a', [['x']]), [item('x', 2)], today).score).toBe(10);
    expect(scoreRecipe(recipe('a', [['x']]), [item('x', 3)], today).score).toBe(5);
    expect(scoreRecipe(recipe('a', [['x']]), [item('x', 6)], today).score).toBe(1);
  });

  it('penalises missing required ingredients only', () => {
    const r = recipe('r', [['spinach'], ['cream', true], ['tortillas']]);
    const s = scoreRecipe(r, [item('spinach', 1)], today);
    expect(s.score).toBe(10 - 6);
    expect(s.missing.map((m) => m.catalogueId)).toEqual(['tortillas']);
  });

  it('assumes pantry staples are present', () => {
    const r = recipe('r', [['salt'], ['oil'], ['black-pepper'], ['water']]);
    const s = scoreRecipe(r, [], today);
    expect(s.missing).toHaveLength(0);
    expect(s.score).toBe(0);
  });

  it('ignores expired items and picks the most urgent duplicate', () => {
    const r = recipe('r', [['milk']]);
    expect(scoreRecipe(r, [item('milk', -1)], today).missing).toHaveLength(1);
    const s = scoreRecipe(r, [item('milk', 9), item('milk', 1)], today);
    expect(s.owned[0].daysLeft).toBe(1);
    expect(s.score).toBe(10);
  });
});

describe('rankRecipes + filterRecipes', () => {
  const recipes = [
    recipe('slow-match', [['spinach']], 40),
    recipe('fast-match', [['spinach']], 10, ['Vegetarian']),
    recipe('one-missing', [['spinach'], ['paneer'], ['tortillas']], 15, ['Vegetarian']),
    recipe('weak', [['onion']], 5),
  ];
  const items = [item('spinach', 0), item('paneer', 1), item('onion', 30)];

  it('sorts by score, then fewest missing, then minutes', () => {
    const ranked = rankRecipes(recipes, items, today).map((s) => s.recipe.id);
    // one-missing: 10 + 10 - 6 = 14; fast/slow: 10; weak: 1
    expect(ranked).toEqual(['one-missing', 'fast-match', 'slow-match', 'weak']);
  });

  it('breaks score ties on missing count before minutes', () => {
    const a = recipe('a-missing', [['spinach'], ['x'], ['paneer'], ['onion'], ['y']], 5); // 10+10+1-12 = 9
    const b = recipe('b-full', [['onion'], ['paneer']], 50); // 1 + 10 - 0 = 11
    const c = recipe('c-tie', [['paneer'], ['zzz'], ['onion'], ['spinach']], 1); // 10-6+1+10 = 15
    const ranked = rankRecipes([a, b, c], items, today).map((s) => s.recipe.id);
    expect(ranked).toEqual(['c-tie', 'b-full', 'a-missing']);
  });

  it('filters by time, vegetarian and only-what-I-have', () => {
    const ranked = rankRecipes(recipes, items, today);
    expect(filterRecipes(ranked, { maxMinutes: 15 }).map((s) => s.recipe.id)).toEqual([
      'one-missing',
      'fast-match',
      'weak',
    ]);
    expect(filterRecipes(ranked, { vegetarian: true }).map((s) => s.recipe.id)).toEqual([
      'one-missing',
      'fast-match',
    ]);
    expect(filterRecipes(ranked, { onlyWhatIHave: true }).map((s) => s.recipe.id)).toEqual([
      'fast-match',
      'slow-match',
      'weak',
    ]);
  });
});
