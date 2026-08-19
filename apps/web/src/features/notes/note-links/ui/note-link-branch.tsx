'use client';

import { useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, CornerDownRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { noteLinkIndent } from './note-link-row-shell';
import { NoteLinkRowSkeleton } from './note-links-skeleton';

import {
  getNoteLinks,
  noteKeys,
  type NoteLinkRef,
} from '@/entities/note';
import { cn } from '@/shared/lib/utils';

interface NoteLinkBranchProps {
  note: NoteLinkRef;
  /**
   * Ids on the path from the panel's root down to this row's parent.
   *
   * The link graph is a graph, not a tree — A can link to B and B back to A,
   * and longer cycles are normal in a set of cross-referenced notes. Rendering
   * it as a tree therefore needs an explicit stop: a note already on the path
   * above cannot be expanded again, or the branch recurses until the browser
   * gives up. Shown as a leaf instead, which reads correctly — following that
   * link takes you back where you came from.
   */
  ancestorIds: string[];
  depth: number;
  onOpen: (noteId: string) => void;
}

/** How deep the branch may go before it stops offering to expand further. */
const MAX_DEPTH = 4;

export function NoteLinkBranch({
  note,
  ancestorIds,
  depth,
  onOpen,
}: NoteLinkBranchProps) {
  const t = useTranslations('dashboard.note');
  const [isExpanded, setIsExpanded] = useState(false);

  const isCycle = ancestorIds.includes(note.id);
  const canExpand = !isCycle && depth < MAX_DEPTH;

  // Lazy by construction: `enabled` keeps the request from leaving until the
  // author actually opens this branch, so drawing the first level costs one
  // query rather than a walk of the whole graph.
  const { data, isPending, isLoadingError } = useQuery({
    queryKey: noteKeys.links(note.id),
    queryFn: async () => {
      const res = await getNoteLinks(note.id);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: isExpanded && canExpand,
  });

  const children = data?.outgoing ?? [];

  // A DISABLED query is `isPending` forever — TanStack has no separate "idle"
  // status in v5 — so the flag on its own says nothing about whether anything
  // is in flight. Gated on the branch actually being open, it means what it
  // reads as: the author expanded this row and its children have not arrived.
  const isLoadingChildren = isExpanded && canExpand && isPending;

  return (
    <li>
      <div
        className="group flex min-h-8 items-center gap-1 rounded-md text-sm"
        style={noteLinkIndent(depth)}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            isExpanded
              ? t('links.collapseAriaLabel')
              : t('links.expandAriaLabel')
          }
          aria-expanded={canExpand ? isExpanded : undefined}
          disabled={!canExpand}
          onClick={() => setIsExpanded((current) => !current)}
          className={cn('size-6 shrink-0', !canExpand && 'invisible')}
        >
          <ChevronRight
            className={cn(
              'size-3.5 transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        </Button>

        <button
          type="button"
          onClick={() => onOpen(note.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-muted-foreground transition-colors hover:text-foreground"
        >
          <CornerDownRight className="size-3.5 shrink-0 opacity-60" />
          <span
            className={cn(
              'truncate',
              // An archived target is still a real link, and hiding it would
              // make the panel disagree with the document. Muted instead, so
              // the author can see where it went.
              note.archivedAt && 'italic opacity-60'
            )}
          >
            {note.title}
          </span>
        </button>
      </div>

      {isExpanded && canExpand && (
        // `aria-busy` rather than a live region, matching `NoteTreeItem`: the
        // placeholder below is decorative, and this is the standard way to say
        // "the contents of this container are not final yet" without inventing
        // a string.
        <ul aria-busy={isLoadingChildren ? true : undefined}>
          {children.map((child) => (
            <NoteLinkBranch
              key={child.id}
              note={child}
              ancestorIds={[...ancestorIds, note.id]}
              depth={depth + 1}
              onOpen={onOpen}
            />
          ))}

          {/* Expanding used to render literally nothing until the fetch
              landed: the chevron rotated, the row stayed put, and an author on
              a slow connection could not tell a request in flight from a note
              that links to nothing. Both look identical when the answer is an
              empty list. The placeholder is row-SHAPED and indented one level
              in, for the reason `note-row-shell.ts` records for the tree — a
              bar in no column does not read as an arriving child. */}
          {isLoadingChildren && (
            // Wrapped in `<li>` because `NoteLinkRowSkeleton` is a `div`, and
            // a `div` may not be a direct child of a `ul`. Same reason
            // `NoteTreeItem` wraps its own placeholder rows.
            <li aria-hidden>
              <NoteLinkRowSkeleton depth={depth + 1} index={0} />
              <NoteLinkRowSkeleton depth={depth + 1} index={1} />
            </li>
          )}

          {/* `isLoadingError`, not `isError`: a failed BACKGROUND refetch — a
              save invalidates every link key — leaves the children already on
              screen in place rather than replacing them with an error line.
              Same distinction `note-tree-panel.tsx` documents at length.
              Without this the branch failed SILENTLY: an unreachable server
              collapsed the subtree back to nothing, which is exactly the
              "you have nothing here" reading a failure must never produce. */}
          {isLoadingError && (
            <li
              className="py-1 text-xs text-destructive"
              style={noteLinkIndent(depth + 1)}
            >
              {t('errors.links')}
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
