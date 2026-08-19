// Straight into the slices, NOT through `@/widgets/dashboard`. That barrel
// re-exports every dashboard widget, including `space-graph` — and its client
// subtree pulls d3-force. Measured on the built app: importing the barrel
// here put the d3 chunk on `/space/notes`, a route with no graph on it.
import { NoteWorkspace } from '@/widgets/notes/note-manager';
import { SpaceNavTrigger } from '@/widgets/notes/space-shell';

/**
 * The notes workspace is mounted HERE, not in the pages below, because a
 * layout survives a change of child segment and a page does not. Opening a
 * note used to remount the tree, the editor and the sidebar wholesale —
 * every expanded folder collapsed, the archived toggle reset, and the view
 * mode snapped back to `tree` — because `[id]/page.tsx` sits inside a
 * dynamic segment whose subtree the router keys by the id itself. See
 * `NoteWorkspace` for the measurement.
 *
 * The pages below are consequently empty: they exist for their `metadata` /
 * `generateMetadata` and for the URL, which is still what a `[[` link, a
 * reload and the Back button all resolve against.
 */
export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NoteWorkspace navSlot={<SpaceNavTrigger className="md:hidden" />} />
      {children}
    </>
  );
}
