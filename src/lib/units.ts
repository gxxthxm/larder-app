import type { Unit } from './types';

const FACTORS: Partial<Record<Unit, { base: 'mass' | 'volume'; factor: number }>> = {
  g: { base: 'mass', factor: 1 },
  kg: { base: 'mass', factor: 1000 },
  ml: { base: 'volume', factor: 1 },
  l: { base: 'volume', factor: 1000 },
};

/** Convert between compatible units (g↔kg, ml↔l). Returns null when incompatible. */
export function convert(amount: number, from: Unit, to: Unit): number | null {
  if (from === to) return amount;
  const a = FACTORS[from];
  const b = FACTORS[to];
  if (!a || !b || a.base !== b.base) return null;
  return (amount * a.factor) / b.factor;
}

/** Round to something a human would type. */
export function tidy(n: number): number {
  if (n >= 100) return Math.round(n);
  if (n >= 10) return Math.round(n * 10) / 10;
  return Math.round(n * 100) / 100;
}

export function formatQty(quantity: number, unit: Unit): string {
  const q = tidy(quantity);
  if (unit === 'pcs') return `${q} ${q === 1 ? 'pc' : 'pcs'}`;
  if (unit === 'l') return `${q} L`;
  if (unit === 'pack') return `${q} ${q === 1 ? 'pack' : 'packs'}`;
  return `${q} ${unit}`;
}

/** Sensible stepper increment per unit. */
export function stepFor(unit: Unit, quantity: number): number {
  switch (unit) {
    case 'g':
    case 'ml':
      return quantity > 500 ? 100 : 50;
    case 'kg':
    case 'l':
      return quantity > 2 ? 0.5 : 0.25;
    case 'pack':
      return quantity < 1 ? 0.25 : 0.5;
    default:
      return 1;
  }
}
