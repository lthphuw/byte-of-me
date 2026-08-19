'use client';

import { useSelectedLayoutSegment } from 'next/navigation';

import { NoteManager } from './note-manager';

export interface NoteWorkspaceProps {
  /** The space navigation trigger, mounted in the list header on phones. */
  navSlot?: React.ReactNode;
}

/**
 * `NoteManager`, mounted from the notes LAYOUT rather than from a page.
 *
 * That placement is the whole point of this component. The App Router keys a
 * dynamic segment's subtree by the value of its parameter (`segment.js`'s
 * `getSelectedLayoutSegmentPath` / the cache key built from it), so a page
 * component under `[id]` is torn down and remounted on every
 * `/space/notes/A` → `/space/notes/B` move — the tree, the editor, the
 * sidebar, all of it. Measured directly in the browser before this existed:
 * a DOM node tagged on the tree `<aside>` did not survive a note switch, and
 * every expanded folder collapsed the moment the author opened a note inside
 * it. A layout does NOT remount when a child segment changes, which is the
 * only reason the explorer's expanded folders, archived toggle and view mode
 * now outlive a note switch.
 *
 * The id comes from `useSelectedLayoutSegment()` — the segment directly below
 * this layout. It is `null` on `/space/notes` itself: Next filters the
 * `__PAGE__` sentinel out in `getSelectedLayoutSegmentPath`, so no
 * `__PAGE__` guard is needed here.
 */
export function NoteWorkspace({ navSlot }: NoteWorkspaceProps) {
  const segment = useSelectedLayoutSegment();

  return <NoteManager noteId={segment} navSlot={navSlot} />;
}
