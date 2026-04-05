'use client';

import { Tag } from '@/models/tag';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TagBadgeProps {
  tag: Tag;
  active?: boolean;
  onClick?: (slug: string) => void;
}

export function TagBadge({ tag, active, onClick }: TagBadgeProps) {
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
