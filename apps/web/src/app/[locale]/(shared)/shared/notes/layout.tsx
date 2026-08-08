import { SharedNoteWorkspace } from '@/widgets/shared/shared-note-workspace';

/**
 * The shared workspace is mounted HERE, not in the page below, for the reason
 * `space/notes/layout.tsx` records: a layout survives a change of child
 * segment and a page does not.
 *
 * Mounting it in the page meant opening a sibling note remounted the tree,
 * the breadcrumb and the document together — every expanded folder collapsed
 * and every level refetched, which reads as the whole screen reloading just
 * to move between two notes in the same shared folder.
 *
 * The page below is consequently empty: it exists for its `metadata` and for
 * the URL, which is still what a reload and the Back button resolve against.
 */
export default function SharedNotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SharedNoteWorkspace />
      {children}
    </>
  );
}
