'use client';

import clsx from 'clsx';

import type { PublicTechStack } from '@/entities/tech-stack/model/types';
import { Badge } from '@/shared/ui';

interface TechStackBadgeProps {
  tech: PublicTechStack;
  active?: boolean;
  onClick?: (slug: string) => void;
}

export function TechStackClickableBadge({
  tech,
  active,
  onClick,
}: TechStackBadgeProps) {
  return (
    <Badge
      variant={active ? 'default' : 'outline'}
      className={clsx(
        'flex cursor-pointer items-center gap-1.5',
        active && 'ring-2 ring-primary'
      )}
      onClick={() => onClick?.(tech.slug)}
    >
      {tech.logo?.url && (
        <img
          src={tech.logo.url}
          alt={tech.name}
          className="h-3 w-3 object-contain"
        />
      )}
      {tech.name}
    </Badge>
  );
}
