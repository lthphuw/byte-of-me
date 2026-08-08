import type { Metadata } from 'next';

import { SharedNoteWorkspace } from '@/widgets/shared/shared-note-workspace';

/**
 * A STATIC title, deliberately — unlike `space/notes/[id]`, which resolves
 * the note's own through `getNoteTitle`.
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
 * The workspace is mounted in the PAGE here, not in the layout as
 * `space/notes` does. That layout exists to survive a change of `[id]` and
 * keep the tree's expansion state; here each share opens its own root and the
 * tree is scoped to it, so there is no cross-note state worth preserving.
 */
export default async function SharedNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SharedNoteWorkspace noteId={id} />;
}
