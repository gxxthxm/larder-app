import type { Item, Recipe, RecipeIngredient } from './types';
import { daysLeft } from './dates';
import { PANTRY_STAPLES } from './catalogue';

export interface OwnedIngredient {
  ingredient: RecipeIngredient;
  /** Absent for pantry staples, which are assumed present. */
  item?: Item;
  daysLeft?: number;
}

export interface ScoredRecipe {
  recipe: Recipe;
  score: number;
  owned: OwnedIngredient[];
  missing: RecipeIngredient[];
  /** Owned ingredients (required or optional) expiring within 5 days, most urgent first. */
  expiring: OwnedIngredient[];
  /** Owned ingredients expiring within 2 days. */
  urgentCount: number;
}

/** Most urgent, non-expired item in the inventory for each catalogue id. */
export function indexInventory(
  items: Item[],
  today: Date = new Date(),
): Map<string, { item: Item; days: number }> {
  const map = new Map<string, { item: Item; days: number }>();
  for (const item of items) {
    if (!item.catalogueId || item.quantity <= 0) continue;
    const days = daysLeft(item, today);
    if (days < 0) continue; // expired food is never suggested
    const prev = map.get(item.catalogueId);
    if (!prev || days < prev.days) map.set(item.catalogueId, { item, days });
  }
  return map;
}

export function pointsFor(days: number): number {
  if (days <= 2) return 10;
  if (days <= 5) return 5;
  return 1;
}

export function scoreRecipe(
  recipe: Recipe,
  items: Item[],
  today: Date = new Date(),
  inventory = indexInventory(items, today),
): ScoredRecipe {
  let score = 0;
  const owned: OwnedIngredient[] = [];
  const missing: RecipeIngredient[] = [];

  for (const ing of recipe.ingredients) {
    if (PANTRY_STAPLES.has(ing.catalogueId)) {
      owned.push({ ingredient: ing });
      continue;
    }
    const hit = inventory.get(ing.catalogueId);
    if (hit) {
      owned.push({ ingredient: ing, item: hit.item, daysLeft: hit.days });
      if (!ing.optional) score += pointsFor(hit.days);
    } else if (!ing.optional) {
      missing.push(ing);
      score -= 6;
    }
  }

  const expiring = owned
    .filter((o) => o.item && o.daysLeft !== undefined && o.daysLeft <= 5)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const urgentCount = expiring.filter((o) => (o.daysLeft ?? 99) <= 2).length;

  return { recipe, score, owned, missing, expiring, urgentCount };
}

export function compareScored(a: ScoredRecipe, b: ScoredRecipe): number {
  return (
    b.score - a.score ||
    a.missing.length - b.missing.length ||
    a.recipe.minutes - b.recipe.minutes ||
    a.recipe.title.localeCompare(b.recipe.title)
  );
}

export function rankRecipes(
  recipes: Recipe[],
  items: Item[],
  today: Date = new Date(),
): ScoredRecipe[] {
  const inventory = indexInventory(items, today);
  return recipes.map((r) => scoreRecipe(r, items, today, inventory)).sort(compareScored);
}

export interface RecipeFilters {
  maxMinutes?: number;
  vegetarian?: boolean;
  onlyWhatIHave?: boolean;
}

export function filterRecipes(ranked: ScoredRecipe[], f: RecipeFilters): ScoredRecipe[] {
  return ranked.filter(
    (s) =>
      (!f.maxMinutes || s.recipe.minutes <= f.maxMinutes) &&
      (!f.vegetarian || s.recipe.tags.includes('Vegetarian')) &&
      (!f.onlyWhatIHave || s.missing.length === 0),
  );
}
