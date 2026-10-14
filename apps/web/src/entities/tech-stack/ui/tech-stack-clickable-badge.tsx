'use client';

import { Badge } from '@byte-of-me/ui';
import Image from 'next/image';

import type { PublicTechStack } from '@/entities/tech-stack/model/types';
import { cn } from '@/shared/lib/utils';

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
  const variant = active ? 'default' : 'outline';
  const content = (
    <>
      {tech.logo?.url && (
        <Image
          src={tech.logo.url}
          alt={tech.name}
          width={12}
          height={12}
          className="h-3 w-3 object-contain"
        />
      )}
      {tech.name}
    </>
  );

  if (!onClick) {
    return (
      <Badge variant={variant} className="gap-1.5">
        {content}
      </Badge>
    );
  }

  return (
    <Badge
      asChild
      variant={variant}
      className={cn('gap-1.5', active && 'ring-2 ring-primary')}
    >
      <button
        type="button"
        aria-pressed={Boolean(active)}
        onClick={() => onClick(tech.slug)}
      >
        {content}
      </button>
    </Badge>
  );
}
