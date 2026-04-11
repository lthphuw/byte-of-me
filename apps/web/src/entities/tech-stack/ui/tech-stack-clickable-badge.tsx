'use client';

import { PublicTechStack } from '@/entities/tech-stack/model/types';
import { Badge } from '@/shared/ui/badge';
import clsx from 'clsx';

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
        'cursor-pointer flex items-center gap-1.5',
        active && 'ring-2 ring-primary'
      )}
      onClick={() => onClick?.(tech.slug)}
    >
      {tech.logo?.url && (
        <img
          src={tech.logo.url}
          alt={tech.name}
          className="w-3 h-3 object-contain"
        />
      )}
      {tech.name}
    </Badge>
  );
}
