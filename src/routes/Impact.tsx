import { useMemo, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { Lightbulb, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import { useLarder } from '@/store/useLarder';
import {
  dataSpanDays,
  monthStats,
  mostWasted,
  periodStats,
  savingsComparison,
  topTossReason,
  weeklySeries,
} from '@/lib/impact';
import { TOSS_REASONS } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { cn, formatMoney } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { EmojiTile } from '@/components/EmojiTile';

const TIPS: Record<string, string> = {
  Forgot: 'Glance at Home each evening — it takes ten seconds and catches things before they turn.',
  WentOffEarly: 'Store herbs upright in a glass of water, and keep greens wrapped in a dry cloth.',
  DidntLike: 'Buy a small amount first when trying something new.',
  TooMuch: 'Freeze half of big packs the day you buy them.',
};

interface TipProps {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | string }[];
  label?: string | number;
  currency: string;
}

function ChartTooltip({ active, payload, label, currency }: TipProps) {
  if (!active || !payload?.length) return null;
  const used = Number(payload.find((p) => p.dataKey === 'used')?.value ?? 0);
  const tossed = Number(payload.find((p) => p.dataKey === 'tossed')?.value ?? 0);
  return (
    <div className="rounded-[14px] bg-ink px-3 py-2 text-xs text-bg shadow-float">
      <p className="mb-1 font-semibold">Week of {label}</p>
      <p>
        <span className="mr-1.5 inline-block size-2 rounded-full bg-brand" />
        Used {formatMoney(used, currency)}
      </p>
      <p>
        <span className="mr-1.5 inline-block size-2 rounded-full bg-expired" />
        Tossed {formatMoney(tossed, currency)}
      </p>
    </div>
  );
}

export default function Impact() {
  const events = useLarder((s) => s.events);
  const currency = useLarder((s) => s.settings.currency);
  const today = useToday();
  const reduce = useReducedMotion();

  const data = useMemo(() => {
    const month = monthStats(events, today);
    const lastStart = startOfMonth(subMonths(today, 1));
    const last = periodStats(events, lastStart, endOfMonth(lastStart));
    const weeks = weeklySeries(events, today, 8);
    return {
      month,
      last,
      weeks,
      wasted: mostWasted(events, 5),
      reason: topTossReason(events),
      span: dataSpanDays(events, today),
    };
  }, [events, today]);

  const fmt = useMemo(() => (n: number) => formatMoney(n, currency), [currency]);

  if (data.span < 14) {
    const pct = Math.min(1, data.span / 14);
    return (
      <>
        <PageHeader overline="Your impact" title="Impact" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex flex-col items-center p-8 text-center"
        >
          <svg viewBox="0 0 120 120" className="size-32 -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--card-2)" strokeWidth="12" />
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 50}
              initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - pct) }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <p className="tabular -mt-[84px] mb-14 font-display text-2xl font-semibold">
            {data.span}/14
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Your impact is warming up
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-ink-2">
            Keep marking things used or tossed. After two weeks you’ll see money saved, your waste
            trend and what tends to go off.
          </p>
          {data.month.saved > 0 && (
            <p className="mt-4 rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-soft-ink">
              {formatMoney(data.month.saved, currency)} saved so far
            </p>
          )}
        </motion.div>
      </>
    );
  }

  const { month, last, weeks, wasted, reason } = data;
  const comparison = savingsComparison(month.saved);
  const rateDelta = last.usedValue + last.tossedValue > 0 ? month.wasteRate - last.wasteRate : 0;
  const firstHalf = weeks.slice(0, 4).reduce((s, w) => s + w.tossed, 0);
  const secondHalf = weeks.slice(4).reduce((s, w) => s + w.tossed, 0);
  const totalUsed = weeks.reduce((s, w) => s + w.used, 0);
  const totalTossed = weeks.reduce((s, w) => s + w.tossed, 0);
  const summary =
    `Over the last 8 weeks you used ${fmt(totalUsed)} of food and tossed ${fmt(totalTossed)}. ` +
    (secondHalf < firstHalf
      ? `Waste fell from ${fmt(firstHalf)} in the first four weeks to ${fmt(secondHalf)} in the last four.`
      : secondHalf > firstHalf
        ? `Waste rose from ${fmt(firstHalf)} to ${fmt(secondHalf)} in the last four weeks.`
        : 'Waste held steady.');
  const maxWaste = Math.max(1, ...wasted.map((w) => w.count));
  const reasonInfo = reason ? TOSS_REASONS.find((r) => r.id === reason.reason) : undefined;

  return (
    <>
      <PageHeader overline="This month" title="Impact" subtitle="Small wins add up." />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="card relative overflow-hidden p-5 lg:col-span-2"
          aria-label="Money saved this month"
        >
          <div
            className="pointer-events-none absolute -top-20 -right-16 size-60 rounded-full opacity-70 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--brand-soft), transparent 70%)' }}
            aria-hidden
          />
          <p className="relative flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-3 uppercase">
            <PiggyBank className="size-4 text-brand" aria-hidden /> Saved this month
          </p>
          <AnimatedNumber
            value={month.saved}
            format={fmt}
            className="tabular relative mt-2 block font-display text-[56px] leading-none font-semibold tracking-tight text-brand"
          />
          <p className="relative mt-2 text-[15px] text-ink-2">
            {comparison
              ? `Saved ${fmt(month.saved)} this month — ${comparison}.`
              : 'Food you used before it expired.'}
          </p>
        </motion.section>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-3">
          <StatTile label="Items wasted" delay={0.06}>
            <AnimatedNumber
              value={month.itemsWasted}
              className="tabular block font-display text-[32px] leading-none font-semibold"
            />
            <span className="mt-1 block text-xs text-ink-2">
              {fmt(month.tossedValue)} this month
            </span>
          </StatTile>
          <StatTile label="Waste rate" delay={0.1}>
            <AnimatedNumber
              value={Math.round(month.wasteRate * 100)}
              format={(n) => `${Math.round(n)}%`}
              className="tabular block font-display text-[32px] leading-none font-semibold"
            />
            {rateDelta !== 0 ? (
              <span
                className={cn(
                  'mt-1 flex items-center gap-1 text-xs font-semibold',
                  rateDelta < 0 ? 'text-brand-soft-ink' : 'text-today-ink',
                )}
              >
                {rateDelta < 0 ? (
                  <TrendingDown className="size-3.5" />
                ) : (
                  <TrendingUp className="size-3.5" />
                )}
                {Math.abs(Math.round(rateDelta * 100))} pts vs last month
              </span>
            ) : (
              <span className="mt-1 block text-xs text-ink-2">of food value</span>
            )}
          </StatTile>
          <StatTile label="Items used" delay={0.14} className="col-span-2 lg:col-span-1">
            <AnimatedNumber
              value={month.itemsUsed}
              className="tabular block font-display text-[32px] leading-none font-semibold"
            />
            <span className="mt-1 block text-xs text-ink-2">
              {fmt(month.usedValue)} of food eaten
            </span>
          </StatTile>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="card p-5 lg:col-span-2"
          aria-labelledby="chart-title"
        >
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="chart-title" className="font-display text-xl font-semibold tracking-tight">
              Last 8 weeks
            </h2>
            <div className="flex items-center gap-3 text-xs font-semibold text-ink-2" aria-hidden>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-brand" /> Used
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-expired" /> Tossed
              </span>
            </div>
          </div>
          <p className="mb-4 text-sm text-ink-2">{summary}</p>
          <div className="h-56 w-full" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                accessibilityLayer={false}
                data={weeks}
                barGap={3}
                barCategoryGap="22%"
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--ink-3)', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--ink-3)', fontSize: 11 }}
                  width={52}
                  tickFormatter={(v: number) => `${currency}${v}`}
                />
                <Tooltip
                  cursor={{ fill: 'var(--card-2)', radius: 10 }}
                  content={<ChartTooltip currency={currency} />}
                />
                <Bar
                  dataKey="used"
                  fill="var(--brand)"
                  radius={[6, 6, 2, 2]}
                  isAnimationActive={!reduce}
                  animationDuration={900}
                />
                <Bar
                  dataKey="tossed"
                  fill="var(--u-expired)"
                  radius={[6, 6, 2, 2]}
                  isAnimationActive={!reduce}
                  animationDuration={900}
                  animationBegin={150}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Value of food used and tossed per week</caption>
            <thead>
              <tr>
                <th>Week starting</th>
                <th>Used</th>
                <th>Tossed</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start}>
                  <td>{w.label}</td>
                  <td>{fmt(w.used)}</td>
                  <td>{fmt(w.tossed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="card p-5"
          aria-labelledby="wasted-title"
        >
          <h2 id="wasted-title" className="mb-3 font-display text-xl font-semibold tracking-tight">
            Most wasted
          </h2>
          {wasted.length === 0 ? (
            <p className="text-sm text-ink-2">Nothing tossed. Impressive.</p>
          ) : (
            <ol className="space-y-3">
              {wasted.map((w, i) => (
                <li key={w.name} className="flex items-center gap-3">
                  <EmojiTile emoji={w.emoji ?? '🛒'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{w.name}</span>
                      <span className="shrink-0 text-ink-2">
                        tossed {w.count} {w.count === 1 ? 'time' : 'times'}
                      </span>
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-2">
                      <motion.div
                        className="h-full rounded-full bg-expired"
                        initial={{ width: 0 }}
                        animate={{ width: `${(w.count / maxWaste) * 100}%` }}
                        transition={{
                          delay: 0.25 + i * 0.07,
                          duration: 0.7,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </motion.section>

        {reason && reasonInfo && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-5"
            aria-labelledby="reason-title"
          >
            <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">
              Top reason for tossing
            </p>
            <h2
              id="reason-title"
              className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight"
            >
              <span aria-hidden>{reasonInfo.emoji}</span> {reasonInfo.label}
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              {Math.round(reason.share * 100)}% of tossed items ({reason.count} of them).
            </p>
            <div className="mt-4 flex gap-3 rounded-[18px] bg-soon-soft p-3.5 text-soon-ink">
              <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="text-sm font-medium">{TIPS[reason.reason]}</p>
            </div>
          </motion.section>
        )}
      </div>
    </>
  );
}

function StatTile({
  label,
  children,
  delay,
  className,
}: {
  label: string;
  children: ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn('card p-4', className)}
    >
      <p className="mb-2 text-xs font-bold tracking-wider text-ink-3 uppercase">{label}</p>
      {children}
    </motion.div>
  );
}
