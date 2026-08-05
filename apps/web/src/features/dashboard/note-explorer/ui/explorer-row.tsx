'use client';

import { FileText } from 'lucide-react';

import type { NoteTreeNode } from '@/entities/note';
import { cn } from '@/shared/lib/utils';

/**
 * One note row in the flat/grouped views — the tree's row look (see
 * `note-tree-item.tsx`) minus the expand chevron, plus an indent-free layout.
 * DnD hooks arrive from the outside as plain props so this stays
 * presentational.
 */
export function ExplorerRow({
  node,
  isActive,
  onSelect,
  actions,
  className,
  ...rest
}: {
  node: NoteTreeNode;
  isActive: boolean;
  onSelect: (id: string) => void;
  actions?: React.ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>) {
  return (
    <div
      className={cn(
        'group flex min-h-9 items-center gap-1 rounded-md px-1 text-sm transition-colors md:min-h-0',
        isActive
          ? 'bg-muted font-medium text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className
      )}
      {...rest}
    >
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        aria-current={isActive ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2 text-left"
      >
        <FileText className="size-3.5 shrink-0" />
        <span className="truncate">{node.title}</span>
      </button>

      {actions}
    </div>
  );
}
