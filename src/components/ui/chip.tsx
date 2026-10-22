import { motion, type HTMLMotionProps } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToggleChipProps extends Omit<HTMLMotionProps<'button'>, 'onChange'> {
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
}

export function ToggleChip({
  pressed,
  onPressedChange,
  className,
  children,
  ...props
}: ToggleChipProps) {
  return (
    <motion.button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      whileTap={{ scale: 0.94 }}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
        pressed
          ? 'border-transparent bg-ink text-bg'
          : 'border-line-strong bg-card text-ink-2 hover:text-ink',
        className,
      )}
      {...props}
    >
      <motion.span
        initial={false}
        animate={{ width: pressed ? 16 : 0, opacity: pressed ? 1 : 0 }}
        className="inline-flex overflow-hidden"
      >
        <Check className="size-4 shrink-0" />
      </motion.span>
      {children as ReactNode}
    </motion.button>
  );
}
