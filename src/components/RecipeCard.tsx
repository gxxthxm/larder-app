import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Check, Clock, Flame } from 'lucide-react';
import type { ScoredRecipe } from '@/lib/scoring';
import { getCatalogueItem } from '@/lib/catalogue';
import { bandFor } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { BAND_STYLE } from './urgency';

const TINTS = [
  'from-[#ffe4cc] to-[#ffd3b0] dark:from-[#3a2a1d] dark:to-[#2d2119]',
  'from-[#dff2dc] to-[#c8eac3] dark:from-[#20321f] dark:to-[#1b281a]',
  'from-[#fde2e0] to-[#fbd0cc] dark:from-[#3a2221] dark:to-[#2d1c1b]',
  'from-[#fff1c9] to-[#ffe6a3] dark:from-[#3a3220] dark:to-[#2d2719]',
  'from-[#e2eefb] to-[#cfe2f7] dark:from-[#1f2a37] dark:to-[#19222d]',
  'from-[#efe4fb] to-[#e0d0f6] dark:from-[#2c2237] dark:to-[#231c2d]',
];

export function recipeTint(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function missingLabel(s: ScoredRecipe): string {
  if (s.missing.length === 0) return 'You have everything';
  if (s.missing.length === 1)
    return `Missing: ${getCatalogueItem(s.missing[0].catalogueId)?.name.toLowerCase() ?? '1 item'}`;
  return `Missing: ${s.missing.length} items`;
}

export function MatchRing({ s, size = 40 }: { s: ScoredRecipe; size?: number }) {
  const required = s.recipe.ingredients.filter((i) => !i.optional).length;
  const pct = required ? (required - s.missing.length) / required : 1;
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-label={`${Math.round(pct * 100)}% of ingredients in your kitchen`}
      role="img"
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--card-2)"
          strokeWidth={4}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct === 1 ? 'var(--brand)' : 'var(--u-soon)'}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <span className="tabular absolute text-[10px] font-bold">{Math.round(pct * 100)}%</span>
    </div>
  );
}

function ExpiringChips({ s, max = 4 }: { s: ScoredRecipe; max?: number }) {
  if (!s.expiring.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-today-soft px-2 py-0.5 text-xs font-semibold text-today-ink">
        <Flame className="size-3.5" aria-hidden />
        Uses {s.expiring.length} expiring {s.expiring.length === 1 ? 'item' : 'items'}
      </span>
      {s.expiring.slice(0, max).map((o) => {
        const band = bandFor(o.daysLeft ?? 9);
        return (
          <span
            key={o.ingredient.catalogueId}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
              BAND_STYLE[band].soft,
              BAND_STYLE[band].ink,
            )}
            title={`${o.item?.name}`}
          >
            <span aria-hidden>{o.item?.emoji}</span>
            <span className="max-w-[84px] truncate">{o.item?.name}</span>
          </span>
        );
      })}
    </div>
  );
}

export function RecipeCard({
  s,
  index = 0,
  featured,
}: {
  s: ScoredRecipe;
  index?: number;
  featured?: boolean;
}) {
  const r = s.recipe;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 32,
        delay: Math.min(index, 8) * 0.035,
      }}
      className={cn('list-none', featured && 'md:col-span-2')}
    >
      <motion.div
        whileTap={{ scale: 0.98 }}
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <Link
          to={`/recipes/${r.id}`}
          className={cn(
            'card group flex gap-3.5 p-3 transition-shadow hover:shadow-float',
            featured && 'flex-col p-4 md:flex-row md:gap-5',
          )}
        >
          <div
            className={cn(
              'grid shrink-0 place-items-center bg-gradient-to-br leading-none',
              recipeTint(r.id),
              featured
                ? 'h-36 w-full rounded-[22px] text-[72px] md:h-auto md:min-h-44 md:w-64'
                : 'size-[84px] rounded-[20px] text-[44px]',
            )}
            aria-hidden
          >
            <motion.span
              className="inline-block"
              whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
              transition={{ duration: 0.5 }}
            >
              {r.emoji}
            </motion.span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {featured && (
                  <p className="mb-1 text-xs font-bold tracking-wider text-brand uppercase">
                    Best match tonight
                  </p>
                )}
                <h3
                  className={cn(
                    'font-display leading-tight font-semibold tracking-tight',
                    featured ? 'text-2xl' : 'text-[17px]',
                  )}
                >
                  {r.title}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
                  <Clock className="size-3.5" aria-hidden /> {r.minutes} min · {r.difficulty}
                  {r.tags.includes('Vegetarian') && (
                    <span className="text-brand-soft-ink">· Veg</span>
                  )}
                </p>
              </div>
              <MatchRing s={s} size={featured ? 46 : 40} />
            </div>
            <ExpiringChips s={s} max={featured ? 5 : 2} />
            <p
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                s.missing.length ? 'text-ink-2' : 'text-brand-soft-ink',
              )}
            >
              {s.missing.length === 0 && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
              {missingLabel(s)}
            </p>
          </div>
        </Link>
      </motion.div>
    </motion.li>
  );
}
