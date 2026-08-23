import type { Metadata } from 'next';

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
 * The list route. The screen itself is `NotesLayout`'s `NoteWorkspace`,
 * which stays mounted across every note the author opens; this page renders
 * nothing and exists for the metadata above and for the URL. On a phone the
 * workspace shows the tree alone here — the editor pane is hidden by CSS,
 * not unmounted — so the browser's own Back button returns from a note.
 */
export default function NotesPage() {
  return null;
}
