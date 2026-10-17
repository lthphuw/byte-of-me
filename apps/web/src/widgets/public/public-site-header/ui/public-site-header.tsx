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
 * Gap between the preferences and account islands: a gutter when docked, and at rest (both
 * transparent, facing edges unpadded) all that keeps the flag and avatar apart. CSS, not
 * animated, so it holds on a cold load before `<LazyMotion>` has fetched its features.
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

      {/* A fixed shell is laid out against the viewport: `--scrollbar-lock` (set by `useLockBody`)
          offsets the scrollbar padding the body gets, and `env(safe-area-inset-*)` clears the
          iOS notch and status bar. paddingRight adds both: both can be non-zero. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight:
            'calc(var(--scrollbar-lock, 0px) + env(safe-area-inset-right))',
        }}
      >
        <div className="container relative">
          <HeaderIsland side="left" docked={docked} geometry={geometry}>
            <PublicHeaderMainNav
              items={globalConfig.header.nav}
              minimized={docked}
            >
              {/* The account, on a phone: PublicHeaderMainNav passes children to the foot of the
                  mobile nav panel. Theme and language stay in the header. */}
              <PublicHeaderAccountPanel />
            </PublicHeaderMainNav>
          </HeaderIsland>

          {/* Right-hand group: a flex row, not two pinned islands. `right` is framer-animated, and
              on a cold load under `<LazyMotion>` no inline style exists yet, so both would paint
              stacked in one corner; flex needs no JavaScript. */}
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
