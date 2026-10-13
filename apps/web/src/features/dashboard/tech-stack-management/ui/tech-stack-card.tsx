'use client';

import Image from 'next/image';

import type { AdminTechStack } from '@/entities/tech-stack';
import { RecordListItem, RecordRowActions } from '@/shared/ui';

export interface TechStackCardProps {
  techStack: AdminTechStack;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function TechStackCard({
  techStack,
  onEdit,
  onDelete,
  isDeleting,
}: TechStackCardProps) {
  return (
    <RecordListItem
      leading={
        techStack.logo?.url ? (
          <div className="relative h-8 w-8 overflow-hidden rounded-md border bg-muted p-1">
            <Image
              src={techStack.logo.url}
              alt={techStack.name}
              fill
              sizes="32px"
              className="object-contain"
            />
          </div>
        ) : undefined
      }
      actions={
        <RecordRowActions
          name={techStack.name}
          onEdit={onEdit}
          onDelete={onDelete}
          disabled={isDeleting}
        />
      }
    >
      <p className="truncate text-sm font-medium leading-none">
        {techStack.name}
      </p>
      <p className="truncate pt-1 text-xs text-muted-foreground">
        {techStack.slug}
      </p>
    </RecordListItem>
  );
}
