import { cn } from '@/lib/utils';
import { getCatalogueItem } from '@/lib/catalogue';
import { CATEGORY_TINT } from './urgency';

interface EmojiTileProps {
  emoji: string;
  catalogueId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  tint?: string;
}

const SIZES = {
  sm: 'size-9 rounded-[12px] text-xl',
  md: 'size-12 rounded-[16px] text-[26px]',
  lg: 'size-16 rounded-[20px] text-[34px]',
  xl: 'size-24 rounded-[30px] text-[52px]',
};

export function EmojiTile({ emoji, catalogueId, size = 'md', className, tint }: EmojiTileProps) {
  const category = getCatalogueItem(catalogueId)?.category ?? 'Other';
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center leading-none select-none',
        SIZES[size],
        tint ?? CATEGORY_TINT[category],
        className,
      )}
    >
      <span className="translate-y-[1px]">{emoji}</span>
    </span>
  );
}
