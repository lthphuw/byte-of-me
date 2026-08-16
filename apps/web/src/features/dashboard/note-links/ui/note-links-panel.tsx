'use client';

import { useQuery } from '@tanstack/react-query';
import { CornerUpLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NoteLinkBranch } from './note-link-branch';
import { NoteLinksSkeleton } from './note-links-skeleton';

import { getNoteLinks, noteKeys } from '@/entities/note';
import { cn } from '@/shared/lib/utils';

interface NoteLinksPanelProps {
  noteId: string;
  onOpen: (noteId: string) => void;
}

/**
 * The open note's neighbourhood in the link graph: what it points at, as an
 * expandable tree, and what points back at it.
 *
 * Backlinks are a flat list rather than a second tree on purpose — expanding
 * "who mentions me" upwards answers a question nobody asks, and every row is
 * one click from becoming the root of its own tree anyway.
 */
export function NoteLinksPanel({ noteId, onOpen }: NoteLinksPanelProps) {
  const t = useTranslations('dashboard.note');

  const { data, isPending, isLoadingError } = useQuery({
    queryKey: noteKeys.links(noteId),
    queryFn: async () => {
      const res = await getNoteLinks(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  const outgoing = data?.outgoing ?? [];
  const incoming = data?.incoming ?? [];

  return (
    // `aria-busy` + a name on the container, matching `NoteEditorSkeleton` and
    // `SpaceHubSkeleton`. The name says "Loading links…" rather than reusing
    // the panel's heading: `aria-busy` alone announces as "Links, busy", which
    // is a state bolted onto a noun, where the loading string is a sentence.
    // The placeholder bars themselves stay decorative — but the container must
    // NOT be, which is the failure `SpaceHubSkeleton` records: an `aria-hidden`
    // subtree with nothing in its place leaves a screen reader on a pane with
    // no perceivable content and no indication that anything is on its way.
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto p-3"
      aria-busy={isPending ? true : undefined}
      aria-label={isPending ? t('links.loading') : undefined}
    >
      {isPending && <NoteLinksSkeleton />}

      {isLoadingError && (
        <p className="text-sm text-destructive">{t('errors.links')}</p>
      )}

      {!isPending && !isLoadingError && (
        <>
          {outgoing.length === 0 && incoming.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('links.empty')}</p>
          )}

          {outgoing.length > 0 && (
            <section>
              <h2 className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {t('links.outgoing')}
              </h2>
              <ul>
                {outgoing.map((note) => (
                  <NoteLinkBranch
                    key={note.id}
                    note={note}
                    // The open note is the root of this tree, so it is the
                    // first ancestor every branch below has to stop at.
                    ancestorIds={[noteId]}
                    depth={0}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            </section>
          )}

          {incoming.length > 0 && (
            <section className={cn(outgoing.length > 0 && 'mt-4')}>
              <h2 className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {t('links.incoming')}
              </h2>
              <ul>
                {incoming.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(note.id)}
                      className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-md py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <CornerUpLeft className="size-3.5 shrink-0 opacity-60" />
                      <span
                        className={cn(
                          'truncate',
                          note.archivedAt && 'italic opacity-60'
                        )}
                      >
                        {note.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
