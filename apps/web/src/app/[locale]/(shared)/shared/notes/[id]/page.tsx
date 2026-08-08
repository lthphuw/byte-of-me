import type { Metadata } from 'next';

/**
 * A STATIC title, deliberately — unlike `space/notes/[id]`, which resolves the
 * note's own through `getNoteTitle`.
 *
 * Metadata is produced before any access check has run, so resolving a title
 * here would hand one to anyone who guessed an id, through the browser tab of
 * a page whose body correctly refuses to load. The label is the one thing on
 * this route that cannot be gated, so it says nothing.
 */
export const metadata: Metadata = {
  title: 'Shared note',
  description: 'A note shared with you.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

/**
 * An open shared note — as a URL and a tab label, not as a render. The
 * workspace that draws it is mounted one level up in `notes/layout.tsx` and
 * reads this segment through `useSelectedLayoutSegment()`, precisely so that
 * opening a second note does not tear the first one's surroundings down.
 */
export default function SharedNotePage() {
  return null;
}
