import Image from 'next/image';

import type { PublicTechStack } from '@/entities/tech-stack';

export interface TechStackBadgeProps {
  tech: PublicTechStack;
}

export function TechStackBadge({ tech }: TechStackBadgeProps) {
  return (
    <div
      key={tech.id}
      className="flex items-center gap-2 rounded-lg border px-3 py-2"
    >
      {tech.logo && (
        <Image src={tech.logo.url} alt={tech.name} width={18} height={18} />
      )}
      <span className="text-sm">{tech.name}</span>
    </div>
  );
}
