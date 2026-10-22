import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tidy } from '@/lib/units';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  suffix,
  label,
  className,
  size = 'md',
}: StepperProps) {
  const set = (v: number) => onChange(tidy(Math.min(max, Math.max(min, v))));
  const btn = cn(
    'grid shrink-0 place-items-center rounded-full bg-card text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)] transition active:scale-90 disabled:opacity-35 dark:bg-card-3',
    size === 'md' ? 'size-11' : 'size-9',
  );
  return (
    <div
      className={cn('flex items-center gap-1 rounded-full bg-card-2 p-1', className)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={btn}
        onClick={() => set(value - step)}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="size-4" />
      </button>
      <div className="relative min-w-[64px] flex-1 overflow-hidden text-center" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="tabular block font-display text-lg font-semibold"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          >
            {tidy(value)}
            {suffix && <span className="ml-1 text-sm font-medium text-ink-2">{suffix}</span>}
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        className={btn}
        onClick={() => set(value + step)}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
