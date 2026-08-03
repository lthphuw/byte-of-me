import type { Metadata } from 'next';

import { NoteManager, SpaceNavTrigger } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Notes',
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

/**
 * An open note.
 *
 * The title deliberately stays the generic "Notes" rather than the note's
 * own: rendering it would mean fetching the document on the server for the
 * sole purpose of the tab label, and the whole point of `getNoteTree`'s
 * narrow select is that note bodies are not fetched to draw chrome. The page
 * is `noindex` anyway.
 */
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
