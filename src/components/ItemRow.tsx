import { forwardRef, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { Check, Snowflake, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Item } from '@/lib/types';
import { daysLeft } from '@/lib/dates';
import { formatQty } from '@/lib/units';
import { canFreeze } from '@/lib/catalogue';
import { cn } from '@/lib/utils';
import { tick } from '@/lib/haptics';
import { exitDirection } from '@/store/useUI';
import { EmojiTile } from './EmojiTile';
import { UrgencyBadge } from './UrgencyBadge';
import { useItemActions } from './ItemActions';

const THRESHOLD = 96;

interface ItemRowProps {
  item: Item;
  today: Date;
  showLocation?: boolean;
  index?: number;
}

const variants = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(i, 10) * 0.03,
      type: 'spring' as const,
      stiffness: 420,
      damping: 34,
    },
  }),
  exit: (id: string) => {
    const dir = exitDirection.get(id);
    return {
      opacity: 0,
      x: dir === 'left' ? -360 : dir === 'right' ? 360 : 0,
      y: dir === 'up' ? -12 : 0,
      scale: dir === 'up' ? 0.96 : 1,
      height: 0,
      marginBottom: 0,
      transition: {
        duration: 0.32,
        ease: [0.4, 0, 0.2, 1] as const,
        height: { delay: 0.12, duration: 0.24 },
      },
    };
  },
};

/** Swipe right = Used, swipe left = Toss, with visible button fallbacks. */
export const ItemRow = forwardRef<HTMLLIElement, ItemRowProps>(function ItemRow(
  { item, today, showLocation, index = 0 },
  ref,
) {
  const navigate = useNavigate();
  const actions = useItemActions();
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const armed = useRef<0 | 1 | -1>(0);
  const days = daysLeft(item, today);
  const frozen = item.location === 'Freezer';
  const freezable = canFreeze(item.catalogueId) && !frozen && days >= 0;

  const usedOpacity = useTransform(x, [0, 24, THRESHOLD], [0, 0.6, 1]);
  const tossOpacity = useTransform(x, [-THRESHOLD, -24, 0], [1, 0.6, 0]);
  const usedScale = useTransform(x, [0, THRESHOLD], [0.6, 1.1]);
  const tossScale = useTransform(x, [-THRESHOLD, 0], [1.1, 0.6]);

  const onDrag = (_: unknown, info: PanInfo) => {
    const a = info.offset.x > THRESHOLD ? 1 : info.offset.x < -THRESHOLD ? -1 : 0;
    if (a !== armed.current) {
      armed.current = a;
      if (a) tick(6);
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    armed.current = 0;
    if (dx > THRESHOLD || info.velocity.x > 800) {
      animate(x, 420, { duration: 0.18 });
      actions.useAll(item);
    } else if (dx < -THRESHOLD || info.velocity.x < -800) {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
      actions.openToss(item);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    }
    window.setTimeout(() => (dragged.current = false), 50);
  };

  return (
    <motion.li
      ref={ref}
      layout="position"
      custom={item.id}
      variants={variants}
      initial="initial"
      animate={variants.animate(index)}
      exit="exit"
      className="relative list-none overflow-hidden rounded-[22px]"
    >
      {/* Swipe backgrounds */}
      <div
        className="absolute inset-0 flex items-center justify-between rounded-[22px] px-5"
        aria-hidden
      >
        <motion.div
          style={{ opacity: usedOpacity }}
          className="absolute inset-0 rounded-[22px] bg-brand"
        />
        <motion.div
          style={{ opacity: tossOpacity }}
          className="absolute inset-0 rounded-[22px] bg-expired"
        />
        <motion.span
          style={{ scale: usedScale, opacity: usedOpacity }}
          className="relative flex items-center gap-2 font-semibold text-white"
        >
          <Check className="size-5" strokeWidth={3} /> Used
        </motion.span>
        <motion.span
          style={{ scale: tossScale, opacity: tossOpacity }}
          className="relative flex items-center gap-2 font-semibold text-white"
        >
          Toss <Trash2 className="size-5" />
        </motion.span>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.85}
        style={{ x }}
        onDragStart={() => (dragged.current = true)}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        className="relative flex items-center gap-3 rounded-[22px] border border-line bg-card py-2.5 pr-2 pl-2.5 shadow-card"
      >
        <button
          type="button"
          onClick={() => !dragged.current && navigate(`/inventory/${item.id}`)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[16px] text-left"
        >
          <EmojiTile emoji={item.emoji} catalogueId={item.catalogueId} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-tight">
              {item.name}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
              <UrgencyBadge days={days} frozen={frozen} />
              <span className="tabular whitespace-nowrap">
                {formatQty(item.quantity, item.unit)}
                {showLocation && ` · ${item.location}`}
              </span>
            </span>
            <span className="sr-only">, open details</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <RowAction
            label={`Mark ${item.name} used`}
            onClick={() => actions.openUse(item)}
            className="hover:bg-brand-soft hover:text-brand-soft-ink"
          >
            <Check className="size-[18px]" strokeWidth={2.6} />
          </RowAction>
          <RowAction
            label={`Toss ${item.name}`}
            onClick={() => actions.openToss(item)}
            className="hover:bg-expired-soft hover:text-expired-ink"
          >
            <Trash2 className="size-[17px]" />
          </RowAction>
          {!frozen && (
            <RowAction
              label={freezable ? `Freeze ${item.name}` : `${item.name} can't be frozen`}
              onClick={() => actions.freeze(item)}
              disabled={!freezable}
              className="hover:bg-frost-soft hover:text-frost-ink"
            >
              <Snowflake className="size-[17px]" />
            </RowAction>
          )}
        </div>
      </motion.div>
    </motion.li>
  );
});

function RowAction({
  label,
  onClick,
  children,
  className,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.85 }}
      className={cn(
        'grid size-11 place-items-center rounded-full text-ink-2 transition-colors disabled:opacity-25',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
