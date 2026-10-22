import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useUI } from '@/store/useUI';
import { prng } from '@/lib/utils';

const COLORS = [
  'var(--brand)',
  'var(--u-today)',
  'var(--u-soon)',
  'var(--u-week)',
  'var(--frost)',
  'var(--u-expired)',
];
const BITS = ['🍅', '🥬', '🧀', '🥕', '🍋'];

/** One small burst, triggered from the UI store. */
export function Confetti() {
  const key = useUI((s) => s.confetti);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!key || reduce) return;
    setActive(key);
    const id = window.setTimeout(() => setActive(0), 2200);
    return () => window.clearTimeout(id);
  }, [key, reduce]);

  const pieces = useMemo(() => {
    const rand = prng(active || 1);
    return Array.from({ length: 46 }, (_, i) => {
      const angle = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.1;
      const power = 260 + rand() * 340;
      return {
        i,
        x: Math.cos(angle) * power,
        y: Math.sin(angle) * power,
        rotate: (rand() - 0.5) * 720,
        color: COLORS[i % COLORS.length],
        emoji: i % 7 === 0 ? BITS[i % BITS.length] : undefined,
        w: 6 + rand() * 6,
        h: 8 + rand() * 8,
        delay: rand() * 0.08,
      };
    });
  }, [active]);

  if (!active) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <div className="absolute bottom-[30%] left-1/2">
        {pieces.map((p) => (
          <motion.span
            key={`${active}-${p.i}`}
            className="absolute block"
            style={{
              width: p.emoji ? 'auto' : p.w,
              height: p.emoji ? 'auto' : p.h,
              background: p.emoji ? undefined : p.color,
              borderRadius: 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{
              x: [0, p.x * 0.9, p.x],
              y: [0, p.y, p.y + 420],
              rotate: p.rotate,
              opacity: [1, 1, 0],
              scale: 1,
            }}
            transition={{
              duration: 1.9,
              delay: p.delay,
              ease: [0.2, 0.7, 0.4, 1],
              times: [0, 0.45, 1],
            }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
