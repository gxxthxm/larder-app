import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToasts, type Toast } from '@/store/useToasts';
import { cn } from '@/lib/utils';

function ToastView({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(t.id), t.duration ?? 5000);
    return () => window.clearTimeout(id);
  }, [t.id, t.duration, dismiss]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
      drag="x"
      dragSnapToOrigin
      onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && dismiss(t.id)}
      className="pointer-events-auto flex w-full items-center gap-3 rounded-[22px] bg-ink py-2.5 pr-2.5 pl-4 text-bg shadow-float"
      role="status"
    >
      {t.emoji && (
        <span className="text-xl" aria-hidden>
          {t.emoji}
        </span>
      )}
      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-sm font-semibold">{t.title}</p>
        {t.description && <p className="truncate text-xs opacity-70">{t.description}</p>}
      </div>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action?.onClick();
            dismiss(t.id);
          }}
          className={cn(
            'h-10 shrink-0 rounded-full bg-bg/15 px-4 text-sm font-semibold transition-colors hover:bg-bg/25',
          )}
        >
          {t.action.label}
        </button>
      )}
    </motion.li>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="larder-toaster pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 md:bottom-6 md:left-auto md:right-6 md:w-[380px] md:px-0"
    >
      <ul className="flex w-full max-w-md flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastView key={t.id} t={t} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
