import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function EmptyState({
  emoji,
  title,
  children,
  action,
}: {
  emoji: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-6 py-12 text-center"
    >
      <motion.div
        className="mb-4 grid size-20 place-items-center rounded-[28px] bg-card-2 text-[44px]"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      >
        {emoji}
      </motion.div>
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {children && <p className="mt-1.5 max-w-xs text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
