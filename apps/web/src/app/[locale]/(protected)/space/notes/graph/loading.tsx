'use client';

import { useTranslations } from 'next-intl';

import { NoteGraphSkeleton } from '@/features/notes/note-graph/ui/note-graph-skeleton';

/**
 * The graph's frame while its RSC payload is in flight. The canvas has its
 * own pending state for the *data* (the query in `NoteGraph`); this covers
 * only the gap before the screen itself exists, which without a boundary here
 * would bubble up to `space/loading.tsx` and flash the hub skeleton.
 *
 * A client component only so the container can carry a translated accessible
 * name — `loading.tsx` cannot be `async`, since a fallback that suspends is
 * no fallback. The pulsing plate stays `aria-hidden` (it is decoration), but
 * hiding it used to be the component's ENTIRE output: a screen reader reached
 * a page with nothing perceivable on it and no announcement that anything was
 * pending. `aria-busy` plus a name is the pattern `NoteEditorSkeleton` and
 * `SpaceHubSkeleton` already use.
 */
export default function SpaceGraphLoading() {
  const t = useTranslations('dashboard.note.graph');

  return (
    <div
      className="min-h-0 flex-1"
      aria-busy="true"
      aria-label={t('loading')}
    >
      {/* The SAME skeleton `NoteGraph` shows while its query runs, rather than
          a plain pulsing plate. Two different placeholders for two consecutive
          waits meant the route fallback drew a grey wash, then swapped it for a
          sketch of clusters, then swapped THAT for the canvas — three distinct
          screens for one navigation. A grey wash is also indistinguishable from
          a canvas that failed to paint at all. */}
      <NoteGraphSkeleton />
    </div>
  );
}
