import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Unique per instance so the sliding pill animates independently. */
  id: string;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Radio group styled as a segmented control with a sliding pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
  label,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const dir =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex rounded-full bg-card-2 p-1', className)}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors',
              size === 'md' ? 'h-10 px-3 text-sm' : 'h-9 px-2.5 text-[13px]',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-6px_rgb(0_0_0/0.18)] dark:bg-card-3"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined && (
                <span
                  className={cn(
                    'tabular rounded-full px-1.5 text-[11px] leading-[18px]',
                    active
                      ? 'bg-brand-soft text-brand-soft-ink'
                      : 'bg-card-3/70 text-ink-2 dark:bg-card',
                  )}
                >
                  {o.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
