import type { Metadata } from 'next';

import { SpaceGraphScreen } from '@/widgets/notes/space-graph';

export const metadata: Metadata = {
  title: 'Knowledge graph',
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
 * The full-screen graph — a view OF the notes, so a route UNDER them. It used
 * to live at `/space/graph`, as a peer of Notes and Health in the space rail,
 * which is a rank it never earned: it plots one module's data and nothing
 * else. `space/graph/page.tsx` is now a redirect here, for open tabs.
 *
 * It is a child of `notes/` by URL only, and that is the whole reason
 * `notes/(workspace)/` exists. Everything inside that group renders under the
 * workspace layout, whose `NoteWorkspace` reads its selected child segment as
 * the open note's id — it would take the literal string `graph` for a note.
 * A route group carries no path segment, so the URL nests while the layout
 * does not, which is exactly the opt-out Next documents it for. The graph
 * also spans every note; it was never a child of one.
 */
export default function SpaceGraphPage() {
  return <SpaceGraphScreen />;
}
