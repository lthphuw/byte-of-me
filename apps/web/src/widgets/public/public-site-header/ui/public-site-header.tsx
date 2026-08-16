'use client';

import { useEffect, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';

import {
  HeaderIsland,
  HeaderIslandGroup,
  useIslandGeometry,
} from './header-island';
import { PublicHeaderAccountIsland } from './public-header-account-island';
import { PublicHeaderAccountPanel } from './public-header-account-panel';
import { PublicHeaderMainNav } from './public-header-main-nav';
import { PublicHeaderSkipLink } from './public-header-skip-link';

import { globalConfig } from '@/shared/config/global';
import { cn } from '@/shared/lib/utils';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';

/**
 * Docking and undocking at the same offset makes the header flicker when the
 * scroll comes to rest right on the threshold, so the two edges are separated.
 */
const DOCK_AT = 64;
const UNDOCK_AT = 24;

/**
 * Space between the preferences island and the account island beside it.
 *
 * Docked it is the visible gutter between two cards; at rest, with both
 * islands transparent and their facing edges unpadded, it is the only thing
 * keeping the language flag and the avatar from touching. Kept in CSS rather
 * than animated, so the group lays out correctly on a cold load before
 * `<LazyMotion>` has fetched its features.
 */
const RIGHT_GROUP = 'transition-[gap] duration-300 ease-out';

export function PublicSiteHeader() {
  const { scrollY } = useScroll();
  const [docked, setDocked] = useState(false);

  // Reading scroll through a motion value keeps the header out of React's
  // render path while scrolling: `setDocked` is only ever handed a new value
  // when a threshold is actually crossed, and React bails out of the rest.
  useMotionValueEvent(scrollY, 'change', (y) =>
    setDocked((wasDocked) => (wasDocked ? y > UNDOCK_AT : y >= DOCK_AT))
  );

  // A reload or back-navigation can land the page mid-scroll without ever
  // firing a scroll event, which would leave the header undocked over content.
  useEffect(() => setDocked(scrollY.get() >= DOCK_AT), [scrollY]);

  const geometry = useIslandGeometry(docked);

  // The islands inside the right-hand group hold icon buttons, and at rest the
  // group applies the outer padding once for the whole row.
  const groupedGeometry = {
    ...geometry,
    paddingX: docked ? geometry.paddingXIcons : 0,
  };

  // Fixed shell + `container`: island insets are measured from the content
  // column, not the viewport, so the header tracks the content at any width.
  return (
    <header>
      {/* First in the DOM, and the header is the first thing the public layout
          renders — so this is the document's first tab stop. */}
      <PublicHeaderSkipLink />

      {/* `--scrollbar-lock` is set by `useLockBody` while the mobile menu is
          open. A fixed element is laid out against the viewport, so it never
          sees the padding the body gets — without this the header alone slides
          sideways by the scrollbar's width every time the menu opens. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50"
        style={{ paddingRight: 'var(--scrollbar-lock, 0px)' }}
      >
        <div className="container relative">
          <HeaderIsland side="left" docked={docked} geometry={geometry}>
            <PublicHeaderMainNav
              items={globalConfig.header.nav}
              minimized={docked}
            >
              {/* The account, on a phone. `PublicHeaderMainNav` passes its
                  children straight to the foot of the mobile nav panel — a
                  slot that existed and had never been filled. Theme and
                  language stay in the header at every size; only the account
                  moved, and only because the row had run out of room. */}
              <PublicHeaderAccountPanel />
            </PublicHeaderMainNav>
          </HeaderIsland>

          {/* The right-hand group.
              A flex row rather than two independently pinned islands: `right`
              is a framer-animated value, and under `<LazyMotion>` there is a
              window on every cold load where no inline style has been applied
              yet — long enough for both islands to paint stacked in the same
              corner. Flex needs no JavaScript to get this right. */}
          <HeaderIslandGroup
            side="right"
            docked={docked}
            geometry={geometry}
            className={cn(RIGHT_GROUP, docked ? 'gap-2' : 'gap-0')}
          >
            <HeaderIsland
              pinned={false}
              side="right"
              docked={docked}
              geometry={groupedGeometry}
            >
              <ColorSchemeModeToggle />
              <I18nToggle />
            </HeaderIsland>

            <PublicHeaderAccountIsland
              docked={docked}
              geometry={groupedGeometry}
            />
          </HeaderIslandGroup>
        </div>
      </div>
    </header>
  );
}
