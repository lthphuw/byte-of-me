'use client';

import { useState } from 'react';
import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  collectDescendantIds,
  moveNote,
  NO_LABEL_GROUP_KEY,
  noteKeys,
  type NoteLabelSummary,
  type NoteTreeNode,
  setNoteLabels,
  updateNote,
} from '@/entities/note';
import {
  getMoveShareExposure,
  type NoteShareExposure,
} from '@/entities/note-share';
import { type ExplorerGroup } from '@/features/dashboard/note-explorer/lib/explorer-model';

/** What a move needs, before it is known whether it has to be confirmed. */
interface MoveInput {
  id: string;
  parentId: string | null;
  position: number;
  acknowledgeSharedDestination?: boolean;
}

/** A move held back until the author agrees to expose the note. */
export interface PendingMove {
  input: MoveInput;
  /** The dragged note's title, for the confirmation's wording. */
  title: string;
  exposure: NoteShareExposure;
}

/** What travels with a dragged row. */
export interface NoteDragData {
  node: NoteTreeNode;
  /** Set in the grouped view — which bucket the drag STARTED in. */
  fromGroup?: ExplorerGroup;
}

/** Drop-target id conventions, shared by the shells in `explorer-dnd.tsx`. */
export const DROP_BEFORE_PREFIX = 'before:';
export const DROP_INTO_PREFIX = 'into:';
export const DROP_ROOT_ID = 'root';
export const DROP_GROUP_PREFIX = 'group:';

/**
 * One past the highest `position` among the LOADED siblings of `parentId`.
 *
 * "Loaded" rather than "all", now that a level arrives one page at a time: a
 * folder whose second page has not been read yet can hold a higher position
 * than anything here, so this is a hint, not an authority. `moveNote` shifts
 * every sibling at or after the requested slot down one before it writes, so a
 * position that collides still lands the row somewhere sane — it just may not
 * be dead last. The alternative, a count query per drop, buys ordering nobody
 * can see.
 */
function nextPositionUnder(
  rows: NoteTreeNode[],
  parentId: string | null
): number {
  return (
    rows
      .filter((row) => row.parentId === parentId)
      .reduce((max, row) => Math.max(max, row.position), -1) + 1
  );
}

/**
 * The explorer's one drag brain: sensors, the active row (for the overlay),
 * and a drop handler that turns tree drops into `moveNote` and grouped drops
 * into status/label writes. All verification the server does anyway (cycle
 * guard, ownership) is repeated here only where it saves a round trip that
 * would visibly fail.
 *
 * `loadedRows` is a GETTER, not an array, and that is load-bearing. The rows
 * come out of the per-level TanStack caches, and expanding a folder settles a
 * query inside `NoteTreeItem` — a component the panel does not re-render for.
 * A snapshot taken at the panel's last render would therefore be missing
 * exactly the level the author just opened, and dropping onto one of its rows
 * would find no target and silently do nothing. Reading at drop time cannot go
 * stale that way.
 */
export function useNoteDnd(
  loadedRows: () => NoteTreeNode[],
  labels: NoteLabelSummary[]
) {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const [activeNode, setActiveNode] = useState<NoteTreeNode | null>(null);

  const sensors = useSensors(
    // Distance 6 keeps plain clicks (select, expand, menu) from becoming
    // zero-length drags; delay 200 makes touch a long-press drag so normal
    // scrolling still works on phones.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const invalidateTrees = () => {
    // Every list-shaped key, not just the tree: the explorer now reads
    // per-level `children` keys, which `tree` does not prefix-match.
    for (const queryKey of noteKeys.lists()) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };

  const move = useMutation({
    mutationFn: async (input: MoveInput) => {
      const res = await moveNote(input);
      if (!res.success) throw new Error(res.errorMsg);
    },
    onSuccess: invalidateTrees,
    onError: (error: Error) =>
      toast.error(t('errors.save'), { description: error.message }),
  });

  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  /**
   * Every tree drop goes through here rather than straight to `move.mutate`.
   *
   * Moving into a shared subtree grants access to everyone who can already
   * open the destination — correct, and the same property that makes moving
   * OUT revoke access for free, but silent. So the destination is checked
   * first and the drop is held until the author agrees.
   *
   * The root level can carry no grant, so it skips the round trip entirely.
   * And if the check itself fails, the move is attempted anyway: `moveNote`
   * repeats the check and refuses an unacknowledged exposure on its own, so
   * the worst case is a red toast rather than either a blocked drag or a
   * silent leak.
   */
  const requestMove = (input: MoveInput, title: string) => {
    if (input.parentId === null) {
      move.mutate(input);
      return;
    }

    void getMoveShareExposure({
      noteId: input.id,
      parentId: input.parentId,
    }).then((res) => {
      if (res.success && res.data.shareCount > 0) {
        setPendingMove({ input, title, exposure: res.data });
        return;
      }
      move.mutate(input);
    });
  };

  const confirmPendingMove = () => {
    if (!pendingMove) return;
    move.mutate({ ...pendingMove.input, acknowledgeSharedDestination: true });
    setPendingMove(null);
  };

  const cancelPendingMove = () => setPendingMove(null);

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const res = await updateNote(input);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(noteKeys.detail(data.id), data);
      invalidateTrees();
    },
    onError: (error: Error) =>
      toast.error(t('errors.save'), { description: error.message }),
  });

  const setLabels = useMutation({
    mutationFn: async (input: { noteId: string; names: string[] }) => {
      const res = await setNoteLabels(input);
      if (!res.success) throw new Error(res.errorMsg);
    },
    onSuccess: () => {
      invalidateTrees();
      void queryClient.invalidateQueries({ queryKey: noteKeys.labels() });
    },
    onError: (error: Error) =>
      toast.error(t('errors.save'), { description: error.message }),
  });

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as NoteDragData | undefined;
    setActiveNode(data?.node ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveNode(null);
    const data = event.active.data.current as NoteDragData | undefined;
    const dragged = data?.node;
    const over = event.over;
    if (!dragged || !over) return;
    const overId = String(over.id);
    // Read once per drop, not once per render — see the getter note above.
    const rows = loadedRows();

    // ----- Tree drops -----
    if (overId === DROP_ROOT_ID) {
      if (dragged.parentId === null) return;
      move.mutate({
        id: dragged.id,
        parentId: null,
        position: nextPositionUnder(rows, null),
      });
      return;
    }

    if (
      overId.startsWith(DROP_BEFORE_PREFIX) ||
      overId.startsWith(DROP_INTO_PREFIX)
    ) {
      const isBefore = overId.startsWith(DROP_BEFORE_PREFIX);
      const targetId = overId.slice(
        isBefore ? DROP_BEFORE_PREFIX.length : DROP_INTO_PREFIX.length
      );
      if (targetId === dragged.id) return;
      // The server's cycle guard would reject this too — checking here just
      // turns a red toast into a silent no-op for an obviously wrong drop.
      //
      // This walks only the LOADED rows, not the whole corpus, and that stays
      // correct rather than getting lucky. A drop target has to be VISIBLE to
      // be dropped on; a descendant is only visible when every folder above it
      // is expanded; and an expanded folder has had its level fetched into the
      // cache these rows come from. So whenever a cyclic drop is even
      // expressible in the UI, the rows that prove it are already loaded. The
      // rows that are missing — subtrees nobody has opened — are precisely the
      // ones `targetId` cannot name. `moveNote` re-checks against the owner's
      // full ancestry regardless, so the worst case here is a round trip that
      // ends in a toast instead of a silent no-op.
      if (collectDescendantIds(rows, dragged.id).includes(targetId)) return;
      const target = rows.find((row) => row.id === targetId);
      if (!target) return;

      if (isBefore) {
        requestMove(
          {
            id: dragged.id,
            parentId: target.parentId,
            position: target.position,
          },
          dragged.title
        );
      } else {
        requestMove(
          {
            id: dragged.id,
            parentId: target.id,
            position: nextPositionUnder(rows, target.id),
          },
          dragged.title
        );
      }
      return;
    }

    // ----- Grouped drops -----
    if (overId.startsWith(DROP_GROUP_PREFIX)) {
      const group = (over.data.current as { group?: ExplorerGroup } | undefined)
        ?.group;
      if (!group || group.key === data?.fromGroup?.key) return;

      if (group.key.startsWith('status:')) {
        const status = group.key.slice('status:'.length);
        if (dragged.status === status) return;
        setStatus.mutate({ id: dragged.id, status });
        return;
      }

      // Label buckets: the note keeps every OTHER label it has, loses the
      // bucket it was dragged out of, gains the one it was dropped on.
      const namesById = new Map(labels.map((label) => [label.id, label.name]));
      const current = new Set(
        dragged.labelIds
          .map((id) => namesById.get(id))
          .filter((name): name is string => Boolean(name))
      );
      const fromLabelId = data?.fromGroup?.labelId;
      if (fromLabelId) {
        const fromName = namesById.get(fromLabelId);
        if (fromName) current.delete(fromName);
      }
      if (group.key !== NO_LABEL_GROUP_KEY && group.labelId) {
        const toName = namesById.get(group.labelId);
        if (toName) current.add(toName);
      }
      setLabels.mutate({ noteId: dragged.id, names: [...current] });
    }
  };

  return {
    sensors,
    activeNode,
    onDragStart,
    onDragEnd,
    pendingMove,
    confirmPendingMove,
    cancelPendingMove,
  };
}
