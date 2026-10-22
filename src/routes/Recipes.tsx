import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';
import { Leaf, PackageCheck, Timer } from 'lucide-react';
import { useLarder } from '@/store/useLarder';
import { filterRecipes, rankRecipes } from '@/lib/scoring';
import { recipes } from '@/data/recipes';
import { useToday } from '@/lib/useToday';
import { daysLeft } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { RecipeCard } from '@/components/RecipeCard';
import { Segmented } from '@/components/ui/segmented';
import { ToggleChip } from '@/components/ui/chip';

type Time = 'any' | '15' | '30' | '45';

/** Filters survive navigating into a recipe and back. */
const useFilters = create<{
  time: Time;
  veg: boolean;
  onlyHave: boolean;
  set: (p: Partial<{ time: Time; veg: boolean; onlyHave: boolean }>) => void;
}>()((set) => ({ time: 'any', veg: false, onlyHave: false, set: (p) => set(p) }));

export default function Recipes() {
  const items = useLarder((s) => s.items);
  const today = useToday();
  const { time, veg, onlyHave, set } = useFilters();

  const ranked = useMemo(() => rankRecipes(recipes, items, today), [items, today]);
  const filters = {
    maxMinutes: time === 'any' ? undefined : Number(time),
    vegetarian: veg,
    onlyWhatIHave: onlyHave,
  };
  const results = filterRecipes(ranked, filters);
  const closest = results.length
    ? []
    : filterRecipes(ranked, { ...filters, onlyWhatIHave: false }).slice(0, 4);
  const fallback = closest.length ? closest : ranked.slice(0, 4);
  const urgentItems = items.filter((i) => {
    const d = daysLeft(i, today);
    return d >= 0 && d <= 2;
  }).length;

  return (
    <>
      <PageHeader
        overline="Recipe matcher"
        title="What to cook"
        subtitle={
          urgentItems
            ? 'Ranked to use up what’s expiring first.'
            : 'Ranked by what you already have.'
        }
      />

      <div className="sticky top-0 z-20 -mx-4 mb-4 space-y-2.5 bg-bg/85 px-4 pt-1 pb-3 backdrop-blur-xl md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <div className="flex items-center gap-2">
          <Timer className="size-5 shrink-0 text-ink-3" aria-hidden />
          <Segmented<Time>
            id="time"
            label="Maximum time"
            size="sm"
            className="flex-1 md:max-w-sm"
            value={time}
            onChange={(t) => set({ time: t })}
            options={[
              { value: 'any', label: 'Any time' },
              { value: '15', label: '15m', ariaLabel: '15 minutes or less' },
              { value: '30', label: '30m', ariaLabel: '30 minutes or less' },
              { value: '45', label: '45m', ariaLabel: '45 minutes or less' },
            ]}
          />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ToggleChip pressed={veg} onPressedChange={(v) => set({ veg: v })}>
            <Leaf className="size-4" aria-hidden /> Vegetarian
          </ToggleChip>
          <ToggleChip pressed={onlyHave} onPressedChange={(v) => set({ onlyHave: v })}>
            <PackageCheck className="size-4" aria-hidden /> Only what I have
          </ToggleChip>
        </div>
      </div>

      <p className="mb-3 text-sm text-ink-2" aria-live="polite">
        {results.length
          ? `${results.length} ${results.length === 1 ? 'recipe' : 'recipes'}, best first`
          : 'No exact matches'}
      </p>

      <AnimatePresence mode="popLayout">
        {results.length === 0 && (
          <motion.div
            key="none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card mb-4 flex items-center gap-3 p-4"
          >
            <span className="text-3xl" aria-hidden>
              🧑‍🍳
            </span>
            <div>
              <p className="font-semibold">Nothing fits every filter</p>
              <p className="text-sm text-ink-2">
                Here are the closest matches — you might need an item or two.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <h2
        className={
          results.length ? 'sr-only' : 'mb-3 font-display text-lg font-semibold tracking-tight'
        }
      >
        {results.length ? 'Matching recipes' : 'Closest matches'}
      </h2>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {(results.length ? results : fallback).map((s, i) => (
            <RecipeCard
              key={s.recipe.id}
              s={s}
              index={i}
              featured={i === 0 && results.length > 0}
            />
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
