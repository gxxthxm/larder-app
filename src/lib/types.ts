export type Location = 'Fridge' | 'Freezer' | 'Pantry';
export type Unit = 'pcs' | 'g' | 'kg' | 'ml' | 'l' | 'pack';
export type TossReason = 'Forgot' | 'WentOffEarly' | 'DidntLike' | 'TooMuch';
export type Category =
  | 'Produce'
  | 'Dairy'
  | 'Meat'
  | 'Seafood'
  | 'Bakery'
  | 'Grains'
  | 'Condiments'
  | 'Frozen'
  | 'Other';

/** Bundled, read-only. */
export interface CatalogueItem {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  defaultLocation: Location;
  shelfLifeDays: Partial<Record<Location, number>>;
  /** Per default unit, in INR. */
  typicalPrice: number;
  defaultUnit: Unit;
  /** Extra names used for autocomplete and bulk-add matching. */
  aliases?: string[];
}

export interface RecipeIngredient {
  catalogueId: string;
  amount: number;
  unit: Unit;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  emoji: string;
  minutes: number;
  difficulty: 'Easy' | 'Medium';
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
}

/** Stored in localStorage. */
export interface Item {
  id: string;
  catalogueId?: string;
  name: string;
  emoji: string;
  location: Location;
  quantity: number;
  unit: Unit;
  price?: number;
  /** ISO date (yyyy-MM-dd). */
  addedAt: string;
  /** ISO date (yyyy-MM-dd). */
  expiresAt: string;
}

export interface ItemEvent {
  id: string;
  itemName: string;
  catalogueId?: string;
  emoji?: string;
  type: 'used' | 'tossed';
  quantity: number;
  unit?: Unit;
  /** INR value of the quantity. */
  value: number;
  reason?: TossReason;
  /** ISO date-time. */
  at: string;
  /** Expiry of the item at the time of the event, used for "saved before expiry". */
  expiresAt?: string;
}

export type ThemePref = 'light' | 'dark' | 'system';

export interface Settings {
  currency: string;
  theme: ThemePref;
  bannerDismissed: boolean;
  celebrated: boolean;
}

export const LOCATIONS: Location[] = ['Fridge', 'Freezer', 'Pantry'];
export const UNITS: Unit[] = ['pcs', 'g', 'kg', 'ml', 'l', 'pack'];
export const TOSS_REASONS: { id: TossReason; label: string; emoji: string }[] = [
  { id: 'Forgot', label: 'Forgot about it', emoji: '🤷' },
  { id: 'WentOffEarly', label: 'Went off early', emoji: '🦠' },
  { id: 'DidntLike', label: "Didn't like it", emoji: '😕' },
  { id: 'TooMuch', label: 'Bought too much', emoji: '🛒' },
];
