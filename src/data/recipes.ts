import recipesData from './recipes.json';
import type { Recipe } from '@/lib/types';

export const recipes = recipesData as Recipe[];
const byId = new Map(recipes.map((r) => [r.id, r]));

export function getRecipe(id: string | undefined): Recipe | undefined {
  return id ? byId.get(id) : undefined;
}
