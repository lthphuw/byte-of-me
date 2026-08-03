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
 * The list route. On a phone this *is* the screen — the tree fills it and no
 * editor is shown; on `md` and up it is the tree plus an empty right pane.
 * Opening a note navigates to `notes/[id]`, so the browser's Back button
 * returns here on its own.
 */
export default async function NotesPage() {
  return (
    <NoteManager noteId={null} navSlot={<SpaceNavTrigger className="md:hidden" />} />
  );
}
