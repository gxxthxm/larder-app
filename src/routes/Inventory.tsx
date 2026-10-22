import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowDownAZ, CalendarClock, Plus, Search, X } from 'lucide-react';
import { useLarder } from '@/store/useLarder';
import { LOCATIONS, type Location } from '@/lib/types';
import { normalise } from '@/lib/catalogue';
import { useToday } from '@/lib/useToday';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { ItemRow } from '@/components/ItemRow';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';

const LOC_EMOJI: Record<Location, string> = { Fridge: '🧊', Freezer: '❄️', Pantry: '🫙' };
const EMPTY_COPY: Record<Location, string> = {
  Fridge: 'Nothing chilling right now. Add what you bought and we’ll track it.',
  Freezer: 'Your freezer is empty. Freezing things that are about to turn buys you weeks.',
  Pantry: 'No dry goods yet. Rice, dal and spices live here.',
};

export default function Inventory() {
  const items = useLarder((s) => s.items);
  const today = useToday();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = (
    LOCATIONS.includes(params.get('loc') as Location) ? params.get('loc') : 'Fridge'
  ) as Location;
  const sort = params.get('sort') === 'name' ? 'name' : 'expiry';
  const q = params.get('q') ?? '';

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => {
    const c: Record<Location, number> = { Fridge: 0, Freezer: 0, Pantry: 0 };
    for (const i of items) c[i.location]++;
    return c;
  }, [items]);

  const query = normalise(q);
  const matches = (name: string) => !query || normalise(name).includes(query);
  const list = items
    .filter((i) => i.location === tab && matches(i.name))
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : a.expiresAt.localeCompare(b.expiresAt) || a.name.localeCompare(b.name),
    );
  const elsewhere = query
    ? LOCATIONS.filter((l) => l !== tab)
        .map((l) => ({ l, n: items.filter((i) => i.location === l && matches(i.name)).length }))
        .filter((x) => x.n)
    : [];

  const openAdd = () => navigate('/add', { state: { background: location } });

  return (
    <>
      <PageHeader overline={`${items.length} items`} title="Kitchen" />

      <Tabs.Root value={tab} onValueChange={(v) => update({ loc: v })}>
        <div className="sticky top-0 z-20 -mx-4 space-y-2.5 bg-bg/85 px-4 pt-1 pb-3 backdrop-blur-xl md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
          <Tabs.List aria-label="Storage location" className="flex rounded-full bg-card-2 p-1">
            {LOCATIONS.map((l) => (
              <Tabs.Trigger
                key={l}
                value={l}
                className={cn(
                  'relative flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors',
                  tab === l ? 'text-ink' : 'text-ink-2 hover:text-ink',
                )}
              >
                {tab === l && (
                  <motion.span
                    layoutId="loc-tab"
                    className="absolute inset-0 rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-6px_rgb(0_0_0/0.18)] dark:bg-card-3"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative" aria-hidden>
                  {LOC_EMOJI[l]}
                </span>
                <span className="relative">{l}</span>
                <span
                  className={cn(
                    'tabular relative rounded-full px-1.5 text-[11px] leading-[18px]',
                    tab === l ? 'bg-brand-soft text-brand-soft-ink' : 'bg-card-3/70 dark:bg-card',
                  )}
                >
                  {counts[l]}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-3"
                aria-hidden
              />
              <input
                type="search"
                aria-label={`Search ${tab.toLowerCase()}`}
                placeholder={`Search ${tab.toLowerCase()}…`}
                value={q}
                onChange={(e) => update({ q: e.target.value })}
                className="h-11 w-full rounded-full border border-line bg-card pr-10 pl-10 text-[15px] outline-none placeholder:text-ink-3 focus:border-brand [&::-webkit-search-cancel-button]:hidden"
              />
              {q && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => update({ q: null })}
                  className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center text-ink-3"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => update({ sort: sort === 'expiry' ? 'name' : null })}
              aria-label={`Sorted by ${sort === 'expiry' ? 'expiry' : 'name'}. Switch to ${sort === 'expiry' ? 'name' : 'expiry'}`}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-sm font-semibold text-ink-2"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={sort}
                  initial={{ opacity: 0, rotate: -30 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 30 }}
                  className="flex"
                >
                  {sort === 'expiry' ? (
                    <CalendarClock className="size-4" />
                  ) : (
                    <ArrowDownAZ className="size-4" />
                  )}
                </motion.span>
              </AnimatePresence>
              {sort === 'expiry' ? 'Expiry' : 'Name'}
            </motion.button>
          </div>
        </div>

        {LOCATIONS.map((l) => (
          <Tabs.Content key={l} value={l} className="mt-2 outline-none">
            {l === tab && (
              <>
                {list.length > 0 ? (
                  <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                    <AnimatePresence initial={false}>
                      {list.map((it, i) => (
                        <ItemRow key={it.id} item={it} today={today} index={i} />
                      ))}
                    </AnimatePresence>
                  </ul>
                ) : query ? (
                  <EmptyState
                    emoji="🔍"
                    title={`No “${q}” in the ${l.toLowerCase()}`}
                    action={
                      elsewhere.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-2">
                          {elsewhere.map((e) => (
                            <Button
                              key={e.l}
                              variant="secondary"
                              onClick={() => update({ loc: e.l })}
                            >
                              Found {e.n} in {e.l}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Button variant="secondary" onClick={openAdd}>
                          <Plus className="size-4" /> Add it
                        </Button>
                      )
                    }
                  >
                    {elsewhere.length
                      ? 'But it’s somewhere else in your kitchen.'
                      : 'Check the spelling, or add it now.'}
                  </EmptyState>
                ) : (
                  <EmptyState
                    emoji={LOC_EMOJI[l]}
                    title={`${l} is empty`}
                    action={
                      <Button onClick={openAdd}>
                        <Plus className="size-5" /> Add groceries
                      </Button>
                    }
                  >
                    {EMPTY_COPY[l]}
                  </EmptyState>
                )}
              </>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </>
  );
}
