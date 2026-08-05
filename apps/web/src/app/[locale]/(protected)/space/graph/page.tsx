import type { Metadata } from 'next';

import { SpaceGraphScreen } from '@/widgets/dashboard/space-graph';

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
 * The full-screen graph.
 *
 * A SIBLING of `/space/notes`, not a child of it. Everything under
 * `space/notes/` renders inside `notes/layout.tsx`, which hosts the whole
 * editor workspace, and `NoteWorkspace` would read the literal segment
 * `graph` as a note id. The graph also spans every note — it was never a
 * child of one. See the route-deviation note in the Phase C plan.
 */
export default function SpaceGraphPage() {
  return <SpaceGraphScreen />;
}
