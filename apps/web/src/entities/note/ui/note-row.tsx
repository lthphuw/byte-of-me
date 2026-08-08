'use client';

import { forwardRef } from 'react';
import { Button } from '@byte-of-me/ui';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';

import type { NoteTreeNode } from '@/entities/note/model/types';
import {
  NOTE_ROW_ACTIVE_BAR_CLASS,
  NOTE_ROW_ACTIVE_CLASS,
  NOTE_ROW_BODY_CLASS,
  NOTE_ROW_CHEVRON_CLASS,
  NOTE_ROW_CLASS,
  NOTE_ROW_FOCUS_CLASS,
  NOTE_ROW_ICON_CLASS,
  NOTE_ROW_SELECTED_CLASS,
  noteRowIndent,
} from '@/entities/note/ui/note-row-shell';
import { cn } from '@/shared/lib/utils';

interface NoteRowOwnProps {
  node: NoteTreeNode;
  depth: number;
  /** The note open in the editor — NOT the explorer's selection. */
  isActive: boolean;
  /** The explorer's cursor. The other half of the pair `isActive` starts. */
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  /** Click on the title: opens a note, expands a folder. */
  onActivate: () => void;
  onStartRename: () => void;
  /** Hover/focus prefetch — "about to open this". */
  onWarm: () => void;
  actions?: React.ReactNode;
  /**
   * The chevron's accessible name, in both states.
   *
   * Passed in rather than translated here, which is the same direction
   * `NoteExplorerControls` runs in and for the same reason. This row is
   * presentational, and reaching into `dashboard.note` from inside it made it
   * silently unusable anywhere that namespace is not mounted — the shared
   * surface deliberately withholds it, and every row threw MISSING_MESSAGE
   * until the labels moved out here.
   */
  expandLabel: string;
  collapseLabel: string;
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
 * Selection and keyboard focus ARE drawn here, and used not to be — they were
 * on the `li` above, which also contains this row's children list, so both
 * framed the whole open subtree. See `NOTE_ROW_FOCUS_CLASS`.
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
    isSelected,
    isExpanded,
    hasChildren,
    onToggle,
    onActivate,
    onStartRename,
    onWarm,
    actions,
    expandLabel,
    collapseLabel,
    className,
    ...rest
  },
  ref
) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cn(
        NOTE_ROW_CLASS,
        NOTE_ROW_FOCUS_CLASS,
        'text-muted-foreground hover:bg-muted hover:text-foreground',
        // Order matters: the cursor's wash is applied last so it wins the
        // background on the common row that is both open AND selected.
        isActive && NOTE_ROW_ACTIVE_CLASS,
        isSelected && NOTE_ROW_SELECTED_CLASS,
        className
      )}
      style={noteRowIndent(depth)}
    >
      {isActive && <span aria-hidden className={NOTE_ROW_ACTIVE_BAR_CLASS} />}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={-1}
        className={cn(NOTE_ROW_CHEVRON_CLASS, !hasChildren && 'invisible')}
        aria-label={isExpanded ? collapseLabel : expandLabel}
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
