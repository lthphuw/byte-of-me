import type { Metadata } from 'next';

import { getNoteTitle } from '@/entities/note';
import { NoteManager, SpaceNavTrigger } from '@/widgets/dashboard';

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

/** An open note. */
export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <NoteManager noteId={id} navSlot={<SpaceNavTrigger className="md:hidden" />} />
  );
}
