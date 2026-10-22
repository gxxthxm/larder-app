import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useUI } from '@/store/useUI';

interface PageHeaderProps {
  overline?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  settings?: boolean;
}

export function PageHeader({ overline, title, subtitle, right, settings = true }: PageHeaderProps) {
  const open = useUI((s) => s.setSettingsOpen);
  return (
    <header className="flex items-end gap-3 pt-3 pb-5 md:pt-8">
      <div className="min-w-0 flex-1">
        {overline && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-1 text-xs font-bold tracking-[0.12em] text-ink-3 uppercase"
          >
            {overline}
          </motion.p>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="font-display text-[34px] leading-[1.05] font-semibold tracking-[-0.025em] md:text-[40px]"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-1.5 text-[15px] text-ink-2"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {right}
      {settings && (
        <button
          type="button"
          onClick={() => open(true)}
          aria-label="Settings"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-card text-ink-2 shadow-card transition-colors hover:text-ink md:hidden"
        >
          <Settings className="size-5" />
        </button>
      )}
    </header>
  );
}
