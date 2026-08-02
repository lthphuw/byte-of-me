'use client';

import { Button } from '@byte-of-me/ui';
import { ChevronRight, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NoteTreeNodeWithChildren } from '@/entities/note/model/note-tree';
import { cn } from '@/shared/lib/utils';

// Deliberately not a role="tree"/"treeitem" widget: that ARIA pattern
// obligates the full tree keyboard interaction model (arrow-key navigation,
// type-ahead, roving tabindex), none of which this component implements.
// A partial tree role is worse than none — assistive tech would announce
// affordances that do not work. Each row is a plain button; the ARIA states
// below (aria-expanded, aria-current) are chosen because they are valid on a
// plain button without any ancestor role, unlike aria-selected which only
// has defined semantics on option/tab/treeitem/row-family roles.
interface NoteTreeItemProps {
  node: NoteTreeNodeWithChildren;
  activeId: string | null;
  expandedIds: Set<string>;
  depth?: number;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

export function NoteTreeItem({
  node,
  activeId,
  expandedIds,
  depth = 0,
  onSelect,
  onToggle,
}: NoteTreeItemProps) {
  const t = useTranslations('dashboard.note');
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isActive = node.id === activeId;

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-1 rounded-md pr-2 text-sm transition-colors',
          isActive
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        // Indentation is inline because the depth is data, not a fixed scale.
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6 shrink-0', !hasChildren && 'invisible')}
          aria-label={
            isExpanded ? t('tree.collapseAriaLabel') : t('tree.expandAriaLabel')
          }
          aria-expanded={hasChildren ? isExpanded : undefined}
          onClick={() => onToggle(node.id)}
        >
          <ChevronRight
            className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')}
          />
        </Button>

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          // aria-current (not aria-selected) because there is no surrounding
          // role="tree"/"listbox" to make aria-selected valid — see the note
          // on ARIA scope in the module comment above. This node behaves like
          // the current entry in a set of related documents, which is exactly
          // what aria-current models (compare blog-breadcrumb.tsx's
          // aria-current="page"); "true" is the generic token for a set that
          // isn't a page, step, date or time.
          aria-current={isActive ? 'true' : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{node.title}</span>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <ul>
          {node.children.map((child) => (
            <NoteTreeItem
              key={child.id}
              node={child}
              activeId={activeId}
              expandedIds={expandedIds}
              depth={depth + 1}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
