'use client';

import { useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, CornerDownRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const { data } = useQuery({
    queryKey: noteKeys.links(note.id),
    queryFn: async () => {
      const res = await getNoteLinks(note.id);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: isExpanded && canExpand,
  });

  const children = data?.outgoing ?? [];

  return (
    <li>
      <div
        className="group flex min-h-8 items-center gap-1 rounded-md text-sm"
        style={{ paddingLeft: `${depth * 12}px` }}
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

      {isExpanded && children.length > 0 && (
        <ul>
          {children.map((child) => (
            <NoteLinkBranch
              key={child.id}
              note={child}
              ancestorIds={[...ancestorIds, note.id]}
              depth={depth + 1}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
