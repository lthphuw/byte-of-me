'use client';

import { TechStack } from '@/models/tech-stack';
import clsx from 'clsx';

import { Badge } from '@/components/ui/badge';

interface TechStackBadgeProps {
  tech: TechStack;
  active?: boolean;
  onClick?: (slug: string) => void;
}

export function TechStackBadge({ tech, active, onClick }: TechStackBadgeProps) {
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
