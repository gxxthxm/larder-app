import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Band } from '@/lib/dates';
import { BAND_STYLE } from './urgency';

interface FreshnessRingProps {
  counts: Record<Band, number>;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}

const ORDER: Band[] = ['expired', 'today', 'soon', 'week', 'later'];

/** Segmented donut of the kitchen by urgency band, drawn on mount. */
export function FreshnessRing({ counts, size = 168, stroke = 14, children }: FreshnessRingProps) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = ORDER.reduce((s, b) => s + counts[b], 0);
  const gap = total > 1 ? Math.min(10, c / total / 3) : 0;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--card-2)"
          strokeWidth={stroke}
        />
        {total > 0 &&
          ORDER.map((band, i) => {
            const n = counts[band];
            if (!n) return null;
            const len = (n / total) * c;
            const dash = Math.max(len - gap, 0.5);
            const start = offset;
            offset += len;
            return (
              <motion.circle
                key={band}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={BAND_STYLE[band].color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
                initial={reduce ? false : { strokeDashoffset: -start + dash, opacity: 0 }}
                animate={{ strokeDashoffset: -start, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
