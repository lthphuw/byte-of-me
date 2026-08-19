'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@byte-of-me/ui';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NoteLabelSummary, NoteTreeNode } from '@/entities/note';
import {
  type ExplorerGroup,
} from '@/features/notes/note-explorer/lib/explorer-model';
import {
  DROP_BEFORE_PREFIX,
  DROP_GROUP_PREFIX,
  DROP_INTO_PREFIX,
  DROP_ROOT_ID,
  type NoteDragData,
  useNoteDnd,
} from '@/features/notes/note-explorer/lib/use-note-dnd';
import { cn } from '@/shared/lib/utils';

/**
 * The one DndContext the explorer mounts, whatever the view. Children are the
 * current view's list; the row/section shells below register the actual drag
 * sources and drop targets. `pointerWithin` collision detection because the
 * tree's "before" strips are thin and nested — rectangle intersection would
 * keep picking the row underneath.
 */
export function ExplorerDnd({
  loadedRows,
  labels,
  showRootZone,
  children,
}: {
  /**
   * Every note row currently in the per-level caches, read at DROP time. See
   * `useNoteDnd` for why this is a getter and not the array it used to be.
   */
  loadedRows: () => NoteTreeNode[];
  labels: NoteLabelSummary[];
  /** The tree view's "move to top level" strip — meaningless elsewhere. */
  showRootZone: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations('dashboard.note.move');
  const {
    sensors,
    activeNode,
    onDragStart,
    onDragEnd,
    pendingMove,
    confirmPendingMove,
    cancelPendingMove,
  } = useNoteDnd(loadedRows, labels);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {children}
      {showRootZone && activeNode && activeNode.parentId !== null && (
        <RootDropZone />
      )}
      <DragOverlay dropAnimation={null}>
        {activeNode && (
          <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-sm shadow-md">
            <FileText className="size-3.5 shrink-0" />
            <span className="max-w-48 truncate">{activeNode.title}</span>
          </div>
        )}
      </DragOverlay>

      {/* Held back until the author agrees to expose the note. `moveNote`
          refuses an unacknowledged move on its own, so this dialog is the
          explanation, not the guard (AGENTS §5). */}
      <AlertDialog
        open={pendingMove !== null}
        onOpenChange={(next) => {
          if (!next) cancelPendingMove();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sharedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMove
                ? t('sharedDescription', {
                    title: pendingMove.title,
                    count: pendingMove.exposure.shareCount,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('sharedCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingMove}>
              {t('sharedConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}

function RootDropZone() {
  const t = useTranslations('dashboard.note.explorer');
  const { setNodeRef, isOver } = useDroppable({ id: DROP_ROOT_ID });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'mx-1 mt-2 rounded-md border border-dashed px-2 py-2 text-center text-xs text-muted-foreground',
        isOver && 'border-primary bg-primary/10 text-foreground'
      )}
    >
      {t('dropToRoot')}
    </div>
  );
}

/**
 * Tree-view shell: the whole row drags; its top sliver is "insert before",
 * the rest is "nest inside". Wraps whatever row markup the entity renders —
 * the entity itself never learns dnd-kit exists.
 */
export function TreeRowDndShell({
  node,
  children,
}: {
  node: NoteTreeNode;
  children: React.ReactNode;
}) {
  const drag = useDraggable({
    id: `note:${node.id}`,
    data: { node } satisfies NoteDragData,
  });
  const before = useDroppable({
    id: `${DROP_BEFORE_PREFIX}${node.id}`,
  });
  const into = useDroppable({
    id: `${DROP_INTO_PREFIX}${node.id}`,
  });

  return (
    <div
      ref={drag.setNodeRef}
      {...drag.listeners}
      {...drag.attributes}
      className={cn('relative', drag.isDragging && 'opacity-40')}
    >
      {/* The thin insert-before strip sits on TOP of the row's first pixels;
          z-index keeps it winning pointerWithin while it is hovered. */}
      <div
        ref={before.setNodeRef}
        className={cn(
          'absolute inset-x-1 top-0 z-10 h-2',
          before.isOver && 'border-t-2 border-primary'
        )}
        aria-hidden
      />
      <div
        ref={into.setNodeRef}
        className={cn(
          'rounded-md',
          into.isOver && 'ring-1 ring-inset ring-primary/70'
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Grouped-view row shell: drag only — reordering inside a bucket is
 *  meaningless (buckets sort themselves), so no droppables here. */
export function GroupedRowDndShell({
  node,
  group,
  children,
}: {
  node: NoteTreeNode;
  group: ExplorerGroup;
  children: React.ReactNode;
}) {
  const drag = useDraggable({
    // A note can sit in two label buckets at once; the group key keeps the
    // draggable id unique per appearance.
    id: `gnote:${group.key}:${node.id}`,
    data: { node, fromGroup: group } satisfies NoteDragData,
  });

  return (
    <div
      ref={drag.setNodeRef}
      {...drag.listeners}
      {...drag.attributes}
      className={cn(drag.isDragging && 'opacity-40')}
    >
      {children}
    </div>
  );
}

/** Grouped-view section shell: the whole section is one drop bucket. */
export function GroupSectionDndShell({
  group,
  children,
}: {
  group: ExplorerGroup;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${DROP_GROUP_PREFIX}${group.key}`,
    data: { group },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-md',
        isOver && 'bg-primary/5 ring-1 ring-inset ring-primary/50'
      )}
    >
      {children}
    </div>
  );
}
