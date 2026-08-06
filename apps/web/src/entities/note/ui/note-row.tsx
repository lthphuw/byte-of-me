'use client';

import { forwardRef } from 'react';
import { Button } from '@byte-of-me/ui';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NoteTreeNode } from '@/entities/note/model/types';
import {
  NOTE_ROW_BODY_CLASS,
  NOTE_ROW_CHEVRON_CLASS,
  NOTE_ROW_CLASS,
  NOTE_ROW_ICON_CLASS,
  noteRowIndent,
} from '@/entities/note/ui/note-row-shell';
import { cn } from '@/shared/lib/utils';

interface NoteRowOwnProps {
  node: NoteTreeNode;
  depth: number;
  /** The note open in the editor — NOT the explorer's selection. */
  isActive: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  /** Click on the title: opens a note, expands a folder. */
  onActivate: () => void;
  onStartRename: () => void;
  /** Hover/focus prefetch — "about to open this". */
  onWarm: () => void;
  actions?: React.ReactNode;
}

/**
 * Anything Radix injects through `asChild` rides along and lands on the root
 * element. See the note on forwarding below — this is not decoration.
 */
type NoteRowProps = NoteRowOwnProps &
  Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'>;

/**
 * One tree row, drawn.
 *
 * Presentational: every decision — what a click means, whether this row is
 * selected, whether it is being renamed — is made by `NoteTreeItem` above and
 * arrives as a prop. Splitting it out keeps the recursive component about the
 * TREE (levels, expansion, children, drafts) and this one about a ROW.
 *
 * The selection ring is deliberately NOT here: it belongs on the `li`, so that
 * it also frames the rename input this row is replaced by, and so the focus
 * ring and the selection ring are the same box.
 *
 * FORWARDS ITS REF AND ITS EXTRA PROPS, and that is load-bearing. This row is
 * what the right-click menu's `ContextMenuTrigger asChild` wraps, and Radix
 * implements `asChild` by CLONING its child with an added `onContextMenu` and a
 * ref. An intrinsic `<div>` accepts both; a component that drops what it is not
 * expecting silently discards them, and the menu then never opens. That has now
 * happened twice — once when the trigger wrapped the drag shell, and again the
 * moment this row was extracted out of `NoteTreeItem` into a component of its
 * own. `note-row.spec.tsx` exists to make it the last time.
 */
export const NoteRow = forwardRef<HTMLDivElement, NoteRowProps>(function NoteRow(
  {
    node,
    depth,
    isActive,
    isExpanded,
    hasChildren,
    onToggle,
    onActivate,
    onStartRename,
    onWarm,
    actions,
    className,
    ...rest
  },
  ref
) {
  const t = useTranslations('dashboard.note');

  return (
    <div
      ref={ref}
      {...rest}
      className={cn(
        NOTE_ROW_CLASS,
        isActive
          ? 'bg-muted font-medium text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className
      )}
      style={noteRowIndent(depth)}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={-1}
        className={cn(NOTE_ROW_CHEVRON_CLASS, !hasChildren && 'invisible')}
        aria-label={
          isExpanded ? t('tree.collapseAriaLabel') : t('tree.expandAriaLabel')
        }
        onClick={(event) => {
          // The row behind this button also selects; expanding must not be
          // read as "the author picked this note".
          event.stopPropagation();
          onToggle();
        }}
      >
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
      </Button>

      <button
        type="button"
        tabIndex={-1}
        onClick={onActivate}
        onDoubleClick={onStartRename}
        onPointerEnter={onWarm}
        onFocus={onWarm}
        // `aria-current`, not `aria-selected`: this says "the note open in the
        // editor", which is a different question from the explorer's cursor.
        // The `treeitem` above carries `aria-selected` for that one.
        aria-current={isActive ? 'true' : undefined}
        className={NOTE_ROW_BODY_CLASS}
      >
        {node.isFolder ? (
          isExpanded ? (
            <FolderOpen className={NOTE_ROW_ICON_CLASS} />
          ) : (
            <Folder className={NOTE_ROW_ICON_CLASS} />
          )
        ) : (
          <FileText className={NOTE_ROW_ICON_CLASS} />
        )}
        <span className="truncate">{node.title}</span>
      </button>

      {actions}
    </div>
  );
});
