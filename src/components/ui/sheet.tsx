import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/lib/useMediaQuery';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Visually hide the title but keep it for screen readers. */
  hideHeader?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Desktop width. */
  size?: 'sm' | 'md' | 'lg';
}

const spring = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const;

/** Bottom sheet on phones (drag the handle to dismiss), centred dialog on desktop. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  children,
  footer,
  className,
  size = 'md',
}: SheetProps) {
  const desktop = useIsDesktop();
  const controls = useDragControls();

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[rgb(20_14_6/0.38)] backdrop-blur-[3px] dark:bg-black/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              onPointerDownOutside={(e) => {
                if ((e.target as HTMLElement | null)?.closest('.larder-toaster'))
                  e.preventDefault();
              }}
            >
              <motion.div
                className={cn(
                  'fixed z-50 flex flex-col bg-card text-ink outline-none',
                  desktop
                    ? cn(
                        'top-1/2 left-1/2 max-h-[min(86dvh,760px)] w-[calc(100vw-48px)] rounded-[30px] shadow-float',
                        size === 'sm' && 'max-w-md',
                        size === 'md' && 'max-w-lg',
                        size === 'lg' && 'max-w-2xl',
                      )
                    : 'inset-x-0 bottom-0 max-h-[94dvh] rounded-t-[30px] shadow-float',
                  className,
                )}
                style={desktop ? { x: '-50%', y: '-50%' } : undefined}
                initial={desktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
                animate={desktop ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={desktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
                transition={spring}
                drag={desktop ? false : 'y'}
                dragControls={controls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.04, bottom: 0.7 }}
                onDragEnd={onDragEnd}
              >
                <div
                  className={cn('shrink-0 touch-none px-5 pt-2', desktop && 'pt-5')}
                  onPointerDown={(e) => !desktop && controls.start(e)}
                >
                  {!desktop && (
                    <div
                      className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong"
                      aria-hidden
                    />
                  )}
                  <div className={cn('flex items-start gap-3 pb-3', hideHeader && 'sr-only')}>
                    <div className="min-w-0 flex-1 pt-1">
                      <Dialog.Title className="font-display text-[22px] leading-tight font-semibold tracking-tight">
                        {title}
                      </Dialog.Title>
                      {description ? (
                        <Dialog.Description className="mt-1 text-sm text-ink-2">
                          {description}
                        </Dialog.Description>
                      ) : (
                        <Dialog.Description className="sr-only">
                          {typeof title === 'string' ? title : 'Dialog'}
                        </Dialog.Description>
                      )}
                    </div>
                    <Dialog.Close
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-card-2 text-ink-2 transition-colors hover:text-ink"
                      aria-label="Close"
                    >
                      <X className="size-5" />
                    </Dialog.Close>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
                  {children}
                </div>
                {footer && (
                  <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
