import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:opacity-45 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-brand-ink hover:bg-brand-strong shadow-[0_6px_20px_-8px_var(--brand)]',
        secondary: 'bg-card-2 text-ink hover:bg-card-3',
        ghost: 'text-ink-2 hover:bg-card-2 hover:text-ink',
        outline: 'border border-line-strong bg-card text-ink hover:bg-card-2',
        danger: 'bg-expired-soft text-expired-ink hover:brightness-95',
        ink: 'bg-ink text-bg hover:opacity-90',
      },
      size: {
        sm: 'h-9 rounded-full px-3.5 text-[13px]',
        md: 'h-11 rounded-full px-5 text-[15px]',
        lg: 'h-14 rounded-[20px] px-6 text-base',
        icon: 'size-11 rounded-full',
        iconSm: 'size-9 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends HTMLMotionProps<'button'>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
