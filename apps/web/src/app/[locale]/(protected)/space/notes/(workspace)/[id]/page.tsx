import type { Metadata } from 'next';

import { getNoteTitle } from '@/entities/note';

/**
 * The tab label carries the note's own title, through `getNoteTitle` — a
 * title-only select, so the document body still never travels to draw
 * chrome (the concern that used to keep this a static "Notes"). Any failure
 * (unknown id, unauthenticated metadata pass) falls back to the generic
 * label; the layout guard still decides whether the PAGE renders.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const base: Metadata = {
    description: 'Private notes. Never published.',
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };

  const { id } = await params;
  try {
    const res = await getNoteTitle(id);
    if (res.success && res.data.trim()) {
      return { ...base, title: res.data };
    }
  } catch {
    // `requireAdmin` can throw/redirect during a metadata pass — the page
    // itself is still protected by the layout guard; only the label degrades.
  }
  return { ...base, title: 'Notes' };
}

/**
 * An open note — as a URL and a tab label, not as a render. The workspace
 * that draws it is mounted one level up in `notes/layout.tsx` and reads this
 * segment through `useSelectedLayoutSegment()`, precisely so that opening a
 * second note does not tear the first one's surroundings down. Rendering the
 * workspace from here again would restore that teardown.
 */
export default function NotePage() {
  return null;
}
