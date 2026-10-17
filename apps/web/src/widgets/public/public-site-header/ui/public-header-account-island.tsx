'use client';

import { Skeleton, useMediaQuery } from '@byte-of-me/ui';

import { useAccount } from '@/widgets/public/public-site-header/lib/use-account';
import {
  HeaderIsland,
  type IslandGeometry,
} from '@/widgets/public/public-site-header/ui/header-island';
import { UserActionToggle } from '@/widgets/public/public-site-header/ui/user-action-toggle';

/**
 * The account's own island, outboard of the preferences one (the owner's, not every visitor's).
 * Unmounted, not hidden, when signed out or below `md`: a flex item that only looks hidden still
 * holds its slot. While the session loads a same-size skeleton holds the avatar's place.
 */
export function PublicHeaderAccountIsland({
  docked,
  geometry,
}: {
  docked: boolean;
  geometry: IslandGeometry;
}) {
  const { account, isLoading } = useAccount();
  // The same query `useIslandGeometry` branches on, so the account can never
  // be on a different side of the breakpoint than the geometry around it.
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!isDesktop || (!account && !isLoading)) return null;

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
      {account ? (
        <UserActionToggle />
      ) : (
        <Skeleton className="size-9 rounded-full" />
      )}
    </HeaderIsland>
  );
}
