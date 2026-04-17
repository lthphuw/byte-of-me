'use client';

import Image from 'next/image';

import type { AdminTechStack } from '@/entities';
import { DeleteButton } from '@/shared/ui/delete-button';
import { EditButton } from '@/shared/ui/edit-button';

export interface TechStackCardProps {
  techStack: AdminTechStack;
  onEdit: (tag: AdminTechStack) => void;
  onDelete: (tag: AdminTechStack) => void;
  isDeleting: boolean;
}
export function TechStackCard({
  techStack,
  onDelete,
  onEdit,
  isDeleting,
}: TechStackCardProps) {
  return (
    <div
      key={techStack.id}
      className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        {techStack.logo?.url && (
          <div className="relative h-8 w-8 overflow-hidden rounded-md border bg-white p-1">
            <Image
              src={techStack.logo.url}
              alt={techStack.name}
              fill
              className="object-contain"
            />
          </div>
        )}
        <div>
          <p className="text-sm font-medium leading-none">{techStack.name}</p>
          <p className="text-xs text-muted-foreground">{techStack.slug}</p>
        </div>
      </div>

      <div className="flex gap-1">
        <EditButton onClick={() => onEdit(techStack)} />
        <DeleteButton
          isSubmitting={isDeleting}
          onClick={() => onDelete(techStack)}
        />
      </div>
    </div>
  );
}
