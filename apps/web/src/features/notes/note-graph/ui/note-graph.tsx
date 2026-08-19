'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { getNoteGraph, noteKeys } from '@/entities/note';
import { NoteGraphCanvas } from '@/features/notes/note-graph/ui/note-graph-canvas';
import { NoteGraphSkeleton } from '@/features/notes/note-graph/ui/note-graph-skeleton';

export interface NoteGraphProps {
  onOpen: (noteId: string) => void;
}

/**
 * The graph plus everything around it: one query, the three states it can be
 * in, and the counts. The canvas below stays a pure renderer and never
 * fetches — which is what would let a hub card and this full-screen route
 * share it.
 */
export function NoteGraph({ onOpen }: NoteGraphProps) {
  const t = useTranslations('dashboard.note.graph');

  const { data, isPending, isLoadingError } = useQuery({
    queryKey: noteKeys.graph(),
    queryFn: async () => {
      const res = await getNoteGraph();
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  // `isLoadingError`, not `isError` — the same distinction `note-tree-panel`
  // documents: a failed BACKGROUND refetch (after a save invalidates the
  // graph) must not replace a perfectly good picture with an error.
  if (isLoadingError) {
    return <p className="p-6 text-sm text-destructive">{t('loadError')}</p>;
  }

  // A graph-SHAPED placeholder, not the full-bleed grey wash this used to be.
  // See `NoteGraphSkeleton` for what the wash got wrong; the short version is
  // that "something is grey here" is indistinguishable from a canvas that
  // failed to paint, and an `aria-hidden` wash left a screen reader with
  // nothing at all on the route.
  if (isPending) {
    return <NoteGraphSkeleton />;
  }

  if (data.nodes.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="relative size-full">
      <NoteGraphCanvas graph={data} onOpen={onOpen} />

      <div className="pointer-events-none absolute right-3 top-3 space-y-0.5 text-right text-xs text-muted-foreground">
        <p>{t('nodeCount', { count: data.nodes.length })}</p>
        <p>{t('edgeCount', { count: data.edges.length })}</p>
        {/* The counts above are honest about what is DRAWN, which is exactly
            why this line has to exist: past the read's caps they stop being
            the size of the vault, and a partial graph looks identical to a
            complete one. Weight and full foreground contrast rather than a
            warning hue — the palette is achromatic, so colour is not
            available as a signal (§14). */}
        {data.truncated && (
          <p className="ml-auto max-w-56 font-medium text-foreground">
            {t('truncated')}
          </p>
        )}
      </div>

      {/* Desktop only: the hint describes a mouse, and the space it costs is
          the scarcest thing on a phone.

          `right-14` clears the reset button in the corner beneath it, and
          `bottom-4` centres this single line against that button's 32px rather
          than aligning their boxes — matching baselines is what makes the two
          read as one control strip instead of two things that collided. */}
      <p className="pointer-events-none absolute bottom-4 right-14 hidden text-xs text-muted-foreground md:block">
        {t('legendHint')}
      </p>
    </div>
  );
}
