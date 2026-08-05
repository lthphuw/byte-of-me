'use client';

import { Button } from '@byte-of-me/ui';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
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
  /**
   * Row actions (archive, delete), rendered at the end of the row.
   *
   * A slot rather than an import: the menu is a feature, and an entity that
   * imported one would invert the layering AGENTS §3 sets out. The widget
   * that owns the tree passes it down.
   */
  renderActions?: (node: NoteTreeNodeWithChildren) => React.ReactNode;
  /**
   * Wraps the ROW (not the children list) — how the drag-and-drop feature
   * attaches its handles and drop targets without this entity ever importing
   * dnd-kit. Same layering rule as `renderActions`.
   */
  renderRowShell?: (
    node: NoteTreeNodeWithChildren,
    row: React.ReactNode
  ) => React.ReactNode;
}

export function NoteTreeItem({
  node,
  activeId,
  expandedIds,
  depth = 0,
  onSelect,
  onToggle,
  renderActions,
  renderRowShell,
}: NoteTreeItemProps) {
  const t = useTranslations('dashboard.note');
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isActive = node.id === activeId;

  const row = (
      <div
        className={cn(
          // `group` so the actions slot can reveal itself on hover; `min-h-9`
          // so a row is a 36px touch target on a phone, where the old
          // `py-1.5`-only row was ~26px — below the 44px Apple/Material floor
          // and genuinely hard to hit next to a sibling row.
          'group flex min-h-9 items-center gap-1 rounded-md pr-1 text-sm transition-colors md:min-h-0',
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
          className={cn('size-7 shrink-0', !hasChildren && 'invisible')}
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
          // A folder has no document to open — clicking it expands it, the
          // way Obsidian's file explorer behaves.
          onClick={() =>
            node.isFolder ? onToggle(node.id) : onSelect(node.id)
          }
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
          {node.isFolder ? (
            isExpanded ? (
              <FolderOpen className="size-3.5 shrink-0" />
            ) : (
              <Folder className="size-3.5 shrink-0" />
            )
          ) : (
            <FileText className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{node.title}</span>
        </button>

        {renderActions?.(node)}
      </div>
  );

  return (
    <li>
      {renderRowShell ? renderRowShell(node, row) : row}

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
              renderActions={renderActions}
              renderRowShell={renderRowShell}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
