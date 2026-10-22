import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
  /** Start counting from zero on first mount. */
  fromZero?: boolean;
}

/** Counts up (or down) to a new value. Instant when reduced motion is on. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toString(),
  className,
  duration = 1.1,
  fromZero = true,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(fromZero ? 0 : value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce, duration, format]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(fromZero && !reduce ? 0 : value)}
    </span>
  );
}
