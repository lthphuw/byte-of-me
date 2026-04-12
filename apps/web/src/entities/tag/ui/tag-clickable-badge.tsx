'use client';

import type { PublicTag } from '@/entities/tag/model/types';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';

interface TagBadgeProps {
  tag: PublicTag;
  active?: boolean;
  onClick?: (slug: string) => void;
}

export function TagClickableBadge({ tag, active, onClick }: TagBadgeProps) {
  return (
    <Badge
      variant={active ? 'default' : 'secondary'}
      className={cn(
        'cursor-pointer transition-colors',
        active && 'ring-2 ring-primary'
      )}
      onClick={() => onClick?.(tag.slug)}
    >
      {tag.name}
    </Badge>
  );
}
