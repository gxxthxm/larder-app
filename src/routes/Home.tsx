import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowRight, ChefHat, ChevronDown, PiggyBank, Plus, Refrigerator, X } from 'lucide-react';
import { format } from 'date-fns';
import { useLarder } from '@/store/useLarder';
import { BANDS, bandFor, daysLeft, type Band } from '@/lib/dates';
import { monthStats, savingsComparison } from '@/lib/impact';
import { rankRecipes } from '@/lib/scoring';
import { recipes } from '@/data/recipes';
import { cn, formatMoney } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { FreshnessRing } from '@/components/FreshnessRing';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { ItemRow } from '@/components/ItemRow';
import { RecipeCard } from '@/components/RecipeCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { BAND_STYLE } from '@/components/urgency';
import { useToday } from '@/lib/useToday';

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return 'Late night snack?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function DemoBanner() {
  const dismissed = useLarder((s) => s.settings.bannerDismissed);
  const update = useLarder((s) => s.updateSettings);
  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="mb-4 overflow-hidden"
          role="note"
        >
          <div className="flex items-center gap-3 rounded-[20px] border border-brand/20 bg-brand-soft py-2 pr-1.5 pl-4 text-brand-soft-ink">
            <span className="text-xl" aria-hidden>
              🧺
            </span>
            <p className="flex-1 text-sm font-medium">
              Sample kitchen loaded. Add your own items or reset anytime.
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => update({ bannerDismissed: true })}
              className="grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-brand/10"
            >
              <X className="size-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hero({ counts, total }: { counts: Record<Band, number>; total: number }) {
  const navigate = useNavigate();
  const urgent = counts.today + counts.soon;
  const allExpired = total > 0 && counts.expired === total;
  const nothingSoon = counts.expired + counts.today + counts.soon + counts.week === 0;

  let headline: string;
  let sub: string;
  if (allExpired) {
    headline = 'Everything here has expired';
    sub = 'Time for a quick clear-out — check and toss what’s gone off.';
  } else if (nothingSoon) {
    headline = 'Nothing needs using soon';
    sub = 'Everything’s good for at least six days. Nice shopping.';
  } else if (urgent === 0) {
    headline = `${counts.week} ${counts.week === 1 ? 'thing' : 'things'} to use this week`;
    sub = 'Nothing urgent in the next two days.';
  } else {
    headline = `${urgent} ${urgent === 1 ? 'thing needs' : 'things need'} using in the next 2 days`;
    sub = counts.today ? `${counts.today} of them today.` : 'Plan them into tonight or tomorrow.';
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="card relative overflow-hidden p-5"
      aria-labelledby="hero-title"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full opacity-60 blur-3xl"
        style={{
          background: urgent
            ? 'radial-gradient(circle, var(--u-today-soft), transparent 70%)'
            : 'radial-gradient(circle, var(--brand-soft), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative flex items-center gap-5">
        <FreshnessRing counts={counts} size={132} stroke={13}>
          <div>
            <AnimatedNumber
              value={allExpired ? counts.expired : urgent}
              className="tabular block font-display text-[44px] leading-none font-semibold tracking-tight"
            />
            <span className="mt-0.5 block text-[11px] font-semibold tracking-wide text-ink-2 uppercase">
              {allExpired ? 'expired' : 'use soon'}
            </span>
          </div>
        </FreshnessRing>
        <ul className="flex-1 space-y-1.5 text-sm" aria-label="Items by urgency">
          {BANDS.map((b) => (
            <li key={b.id} className="flex items-center gap-2">
              <span
                className={cn('size-2.5 shrink-0 rounded-full', BAND_STYLE[b.id].dot)}
                aria-hidden
              />
              <span className="flex-1 text-ink-2">{b.id === 'later' ? 'Later' : b.label}</span>
              <span className="tabular font-semibold">{counts[b.id]}</span>
            </li>
          ))}
        </ul>
      </div>
      <h2
        id="hero-title"
        className="relative mt-5 font-display text-[22px] leading-tight font-semibold tracking-tight"
      >
        {headline}
      </h2>
      <p className="relative mt-1 text-sm text-ink-2">{sub}</p>
      <Button
        size="lg"
        className="relative mt-4 w-full"
        onClick={() =>
          allExpired
            ? document.getElementById('band-expired')?.scrollIntoView({ behavior: 'smooth' })
            : navigate('/recipes')
        }
      >
        {allExpired ? 'Review expired items' : nothingSoon ? 'Browse recipes' : 'What can I cook?'}
        <ArrowRight className="size-5" />
      </Button>
    </motion.section>
  );
}

function StatTiles({ total, byLocation }: { total: number; byLocation: Record<string, number> }) {
  const events = useLarder((s) => s.events);
  const currency = useLarder((s) => s.settings.currency);
  const saved = monthStats(events).saved;
  const comparison = savingsComparison(saved);
  const fmt = useMemo(() => (n: number) => formatMoney(n, currency), [currency]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <Link
          to="/impact"
          className="card flex h-full flex-col p-4 transition-shadow hover:shadow-float"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-3 uppercase">
            <PiggyBank className="size-4 text-brand" aria-hidden /> Saved
          </span>
          <AnimatedNumber
            value={saved}
            format={fmt}
            className="tabular mt-2 block font-display text-[28px] leading-none font-semibold tracking-tight text-brand"
          />
          <span className="mt-1.5 text-xs text-ink-2">
            {comparison ? `This month — ${comparison}` : 'This month'}
          </span>
        </Link>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <Link
          to="/inventory"
          className="card flex h-full flex-col p-4 transition-shadow hover:shadow-float"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-3 uppercase">
            <Refrigerator className="size-4 text-frost" aria-hidden /> Kitchen
          </span>
          <AnimatedNumber
            value={total}
            className="tabular mt-2 block font-display text-[28px] leading-none font-semibold tracking-tight"
          />
          <span className="mt-1.5 text-xs text-ink-2">
            {byLocation.Fridge ?? 0} fridge · {byLocation.Freezer ?? 0} freezer ·{' '}
            {byLocation.Pantry ?? 0} pantry
          </span>
        </Link>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const items = useLarder((s) => s.items);
  const today = useToday();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLater, setShowLater] = useState(false);

  const { groups, counts, byLocation } = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.name.localeCompare(b.name),
    );
    const groups: Record<Band, typeof items> = {
      expired: [],
      today: [],
      soon: [],
      week: [],
      later: [],
    };
    const byLocation: Record<string, number> = {};
    for (const it of sorted) {
      groups[bandFor(daysLeft(it, today))].push(it);
      byLocation[it.location] = (byLocation[it.location] ?? 0) + 1;
    }
    const counts = Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, v.length]),
    ) as Record<Band, number>;
    return { groups, counts, byLocation };
  }, [items, today]);

  const best = useMemo(() => rankRecipes(recipes, items, today)[0], [items, today]);
  const showBest = best && best.expiring.length > 0;

  if (!items.length) {
    return (
      <>
        <PageHeader overline={format(today, 'EEEE d MMM')} title={greeting(today)} />
        <DemoBanner />
        <div className="card">
          <EmptyState
            emoji="🧺"
            title="Your larder is empty"
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => navigate('/add', { state: { background: location } })}>
                  <Plus className="size-5" /> Add groceries
                </Button>
                <Button variant="secondary" onClick={() => useLarder.getState().resetDemo()}>
                  Load sample kitchen
                </Button>
              </div>
            }
          >
            Add what you just bought and Larder will tell you what to use first — and what to cook
            with it.
          </EmptyState>
        </div>
      </>
    );
  }

  const visibleBands = BANDS.filter((b) => b.id !== 'later' && counts[b.id] > 0);

  return (
    <>
      <PageHeader overline={format(today, 'EEEE d MMM')} title={greeting(today)} />
      <DemoBanner />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-8">
          <Hero counts={counts} total={items.length} />
          <StatTiles total={items.length} byLocation={byLocation} />
          {showBest && (
            <section aria-labelledby="tonight">
              <div className="mt-2 mb-2.5 flex items-center justify-between">
                <h2
                  id="tonight"
                  className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
                >
                  <ChefHat className="size-5 text-brand" aria-hidden /> Cook tonight
                </h2>
                <Link
                  to="/recipes"
                  className="flex h-11 items-center px-1 text-sm font-semibold text-brand-soft-ink"
                >
                  All recipes
                </Link>
              </div>
              <ul>
                <RecipeCard s={best} />
              </ul>
            </section>
          )}
        </div>

        <section aria-labelledby="use-soon">
          <h2
            id="use-soon"
            className="mb-1 font-display text-[22px] font-semibold tracking-tight lg:mt-1"
          >
            Use soon
          </h2>
          <p className="mb-3 text-sm text-ink-2">Swipe right when used, left to toss.</p>
          {visibleBands.length === 0 && (
            <div className="card mb-4 px-4 py-6 text-center">
              <p className="text-2xl" aria-hidden>
                🌿
              </p>
              <p className="mt-1 font-semibold">All fresh for now</p>
              <p className="text-sm text-ink-2">Nothing expires in the next five days.</p>
            </div>
          )}
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {visibleBands.map((b) => (
                <BandGroup
                  key={b.id}
                  band={b.id}
                  label={b.label}
                  hint={b.hint}
                  items={groups[b.id]}
                  today={today}
                />
              ))}
            </AnimatePresence>
            {counts.later > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowLater((v) => !v)}
                  aria-expanded={showLater}
                  className="flex h-12 w-full items-center gap-2 rounded-[18px] px-1 text-left"
                >
                  <span className={cn('size-2.5 rounded-full', BAND_STYLE.later.dot)} aria-hidden />
                  <span className="font-semibold">Later</span>
                  <span className="tabular rounded-full bg-card-2 px-2 text-xs leading-5 font-semibold text-ink-2">
                    {counts.later}
                  </span>
                  <span className="flex-1 text-sm text-ink-3">Plenty of time</span>
                  <motion.span animate={{ rotate: showLater ? 180 : 0 }}>
                    <ChevronDown className="size-5 text-ink-2" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {showLater && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <ul className="space-y-2 pt-1">
                        <AnimatePresence initial={false}>
                          {groups.later.map((it, i) => (
                            <ItemRow key={it.id} item={it} today={today} index={i} showLocation />
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function BandGroup({
  band,
  label,
  hint,
  items,
  today,
}: {
  band: Band;
  label: string;
  hint: string;
  items: ReturnType<typeof useLarder.getState>['items'];
  today: Date;
}) {
  return (
    <motion.div
      layout="position"
      id={`band-${band}`}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn('size-2.5 rounded-full', BAND_STYLE[band].dot)} aria-hidden />
        <h3 className="font-semibold">{label}</h3>
        <span className="tabular rounded-full bg-card-2 px-2 text-xs leading-5 font-semibold text-ink-2">
          {items.length}
        </span>
        <span className="text-sm text-ink-3">{hint}</span>
      </div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((it, i) => (
            <ItemRow key={it.id} item={it} today={today} index={i} showLocation />
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}
