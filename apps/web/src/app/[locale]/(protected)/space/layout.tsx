import type { Metadata } from 'next';

import { getOwnerDisplayName } from '@/entities/user-profile/api/get-owner-display-name';
import { buildIconSet } from '@/shared/lib/metadata';
import { SpaceShell } from '@/widgets/dashboard/space-shell';

export async function generateMetadata(): Promise<Metadata> {
  // `getOwnerDisplayName`, not `getUserProfile`. Next resolves metadata across
  // the whole route tree on every request, including RSC navigations this
  // layout is unchanged by — so this ran the full user → profile →
  // translations join on every note-to-note move, for a title that
  // `notes/page.tsx`, `notes/[id]/page.tsx` and `graph/page.tsx` all override
  // anyway. That is the same round trip `note-manager.tsx` documents at ~990ms
  // and `use-note-prefetch.ts` exists to spend earlier. The replacement selects
  // one column and is `cache()`d, so `/space` — where the title IS used, and
  // where `SpaceHub` needs the same name — pays for one query instead of two
  // whole profiles.
  const userName = await getOwnerDisplayName();

  return {
    title: `Space | Welcome, ${userName}`,
    description: 'Personal workspace to manage notes, schedule.',
    // The most enclosed layer of the mark: knocked out of a solid plate, so a
    // vault tab is the one silhouette that reads instantly in a crowded strip.
    icons: buildIconSet('space'),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    // Reset, not merely left unset: Next MERGES metadata down the tree, so
    // omitting these inherits the root locale layout's public values. A
    // private note was emitting `<link rel="canonical">` pointing at the
    // public homepage — declaring itself a duplicate of a page it has nothing
    // to do with — plus that homepage's `hreflang` pair, and pasting a
    // `/space/notes/<id>` link into Slack unfurled the site's marketing card.
    // `null` is how the Metadata type spells "drop the inherited value";
    // `undefined` would just be silence, which is what inherits.
    alternates: null,
    openGraph: null,
    twitter: null,
  };
}

export default async function SpaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SpaceShell>{children}</SpaceShell>;
}
