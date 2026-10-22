import { bandFor, daysLeftLabel, daysLeftShort } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { BAND_STYLE } from './urgency';

interface UrgencyBadgeProps {
  days: number;
  compact?: boolean;
  frozen?: boolean;
  className?: string;
}

/** Colour is never the only signal: every badge carries a text label. */
export function UrgencyBadge({ days, compact, frozen, className }: UrgencyBadgeProps) {
  const band = bandFor(days);
  const s = BAND_STYLE[band];
  if (frozen && days >= 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-frost-soft px-2 py-0.5 text-xs font-semibold text-frost-ink',
          className,
        )}
      >
        <span aria-hidden>❄︎</span>
        {compact ? daysLeftShort(days) : daysLeftLabel(days)}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        s.soft,
        s.ink,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
      {compact ? daysLeftShort(days) : daysLeftLabel(days)}
    </span>
  );
}
