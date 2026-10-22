import type { Band } from '@/lib/dates';

export const BAND_STYLE: Record<
  Band,
  { dot: string; soft: string; ink: string; color: string; ring: string }
> = {
  expired: {
    dot: 'bg-expired',
    soft: 'bg-expired-soft',
    ink: 'text-expired-ink',
    color: 'var(--u-expired)',
    ring: 'ring-expired/40',
  },
  today: {
    dot: 'bg-today',
    soft: 'bg-today-soft',
    ink: 'text-today-ink',
    color: 'var(--u-today)',
    ring: 'ring-today/40',
  },
  soon: {
    dot: 'bg-soon',
    soft: 'bg-soon-soft',
    ink: 'text-soon-ink',
    color: 'var(--u-soon)',
    ring: 'ring-soon/40',
  },
  week: {
    dot: 'bg-week',
    soft: 'bg-week-soft',
    ink: 'text-week-ink',
    color: 'var(--u-week)',
    ring: 'ring-week/40',
  },
  later: {
    dot: 'bg-later',
    soft: 'bg-later-soft',
    ink: 'text-later-ink',
    color: 'var(--u-later)',
    ring: 'ring-later/40',
  },
};

/** Soft tile tints by food category so lists scan like a shelf. */
export const CATEGORY_TINT: Record<string, string> = {
  Produce: 'bg-[#e4f3df] dark:bg-[#22301f]',
  Dairy: 'bg-[#eef1f8] dark:bg-[#252a33]',
  Meat: 'bg-[#fbe5df] dark:bg-[#35231f]',
  Seafood: 'bg-[#e1eef8] dark:bg-[#1f2b35]',
  Bakery: 'bg-[#f8ead6] dark:bg-[#33291d]',
  Grains: 'bg-[#f4edd9] dark:bg-[#302b1f]',
  Condiments: 'bg-[#f6e6e0] dark:bg-[#33251f]',
  Frozen: 'bg-[#e3f0f7] dark:bg-[#1f2d33]',
  Other: 'bg-card-2',
};
