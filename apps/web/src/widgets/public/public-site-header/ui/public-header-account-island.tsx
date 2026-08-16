'use client';

import { useMediaQuery } from '@byte-of-me/ui';

import { useAccount } from '@/widgets/public/public-site-header/lib/use-account';
import {
  HeaderIsland,
  type IslandGeometry,
} from '@/widgets/public/public-site-header/ui/header-island';
import { UserActionToggle } from '@/widgets/public/public-site-header/ui/user-action-toggle';

/**
 * The account's own island, outboard of the preferences one — theme and
 * language are what any visitor wants; this is only ever the owner's. Docked
 * they read as two pills with a gap; at rest, unpadded, as one row.
 *
 * Unmounted rather than hidden when signed out or below `md`: it is a flex
 * item, and one that only looks hidden still holds its slot.
 */
export function PublicHeaderAccountIsland({
  docked,
  geometry,
}: {
  docked: boolean;
  geometry: IslandGeometry;
}) {
  const { account } = useAccount();
  // The same query `useIslandGeometry` branches on, so the account can never
  // be on a different side of the breakpoint than the geometry around it.
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!account || !isDesktop) return null;

  return (
    <HeaderIsland
      pinned={false}
      side="right"
      docked={docked}
      geometry={geometry}
      // At rest there is no card, so the edge facing the preferences island
      // needs no padding — 32px there would open a gap wide enough to read as
      // a mistake between two things that should look adjacent.
      padding={docked ? undefined : { left: 0 }}
    >
      <UserActionToggle />
    </HeaderIsland>
  );
}
