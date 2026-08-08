'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { NoteRow, type NoteTreeNode } from '@/entities/note';
import {
  getSharedNoteChildren,
  noteShareKeys,
  sharedNoteHref,
} from '@/entities/note-share';
import { useRouter } from '@/shared/i18n/navigation';

/**
 * One level of the shared tree, recursing on expand.
 *
 * Each level is its own query, mirroring the owner's explorer: a collapsed
 * folder costs nothing until somebody opens it. `NoteRow` is reused as-is —
 * it is purely presentational and `getSharedNoteChildren` already returns the
 * `NoteTreeNode` it expects. `NoteTreeItem` is deliberately NOT reused: it is
 * wired to `NoteExplorerControls`, an interaction contract (drafts, renames,
 * drag) this surface does not have and must not grow.
 */
export function SharedNoteTree({
  parentId,
  activeId,
  depth = 0,
}: {
  parentId: string;
  /** The note currently open, for the row's active state. */
  activeId: string;
  depth?: number;
}) {
  const t = useTranslations('share.note');
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const level = useQuery({
    queryKey: noteShareKeys.children(parentId),
    queryFn: async () => {
      const res = await getSharedNoteChildren(parentId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  const toggle = (id: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  if (level.isPending) {
    return (
      <ul className="flex flex-col gap-1 px-1 py-1" aria-hidden>
        {[0, 1].map((row) => (
          <li key={row} className="h-7 animate-pulse rounded-md bg-muted" />
        ))}
      </ul>
    );
  }

  if (level.isError) {
    return (
      <p className="px-2 py-1 text-xs text-destructive">{t('notFound')}</p>
    );
  }

  if (level.data.length === 0) {
    return depth === 0 ? (
      <p className="px-2 py-1 text-xs text-muted-foreground">
        {t('emptyFolder')}
      </p>
    ) : null;
  }

  return (
    <ul className="flex flex-col">
      {level.data.map((node: NoteTreeNode) => {
        const isExpanded = expandedIds.has(node.id);

        return (
          <li key={node.id}>
            <NoteRow
              node={node}
              depth={depth}
              isActive={node.id === activeId}
              // The explorer's cursor is an owner-side concept; here the URL
              // is the only selection there is.
              isSelected={false}
              isExpanded={isExpanded}
              hasChildren={node.childCount > 0}
              onToggle={() => toggle(node.id)}
              onActivate={() => {
                if (node.isFolder) {
                  toggle(node.id);
                  return;
                }
                router.push(sharedNoteHref(node.id));
              }}
              // No rename, and no prefetch-on-hover: renaming is owner-only,
              // and warming a route this surface refuses for most ids would
              // spend requests to learn nothing.
              onStartRename={() => {}}
              onWarm={() => {}}
              expandLabel={t('expand')}
              collapseLabel={t('collapse')}
            />

            {isExpanded ? (
              <SharedNoteTree
                parentId={node.id}
                activeId={activeId}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
