'use client';

import { Badge } from '@byte-of-me/ui';

import type { PublicTag } from '@/entities/tag/model/types';
import { cn } from '@/shared/lib/utils';

interface TagBadgeProps {
  tag: PublicTag;
  active?: boolean;
  onClick?: (slug: string) => void;
}

export function TagClickableBadge({ tag, active, onClick }: TagBadgeProps) {
  const variant = active ? 'default' : 'secondary';

  if (!onClick) return <Badge variant={variant}>{tag.name}</Badge>;

  return (
    <Badge
      asChild
      variant={variant}
      className={cn(active && 'ring-2 ring-primary')}
    >
      <button
        type="button"
        aria-pressed={Boolean(active)}
        onClick={() => onClick(tag.slug)}
      >
        {tag.name}
      </button>
    </Badge>
  );
}
