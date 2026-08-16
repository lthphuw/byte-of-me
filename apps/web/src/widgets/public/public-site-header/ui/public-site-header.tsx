'use client';

import { useEffect, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';

import { HeaderIsland, useIslandGeometry } from './header-island';
import { PublicHeaderMainNav } from './public-header-main-nav';
import { PublicHeaderSkipLink } from './public-header-skip-link';
import { UserActionToggle } from './user-action-toggle';

import { globalConfig } from '@/shared/config/global';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';

/**
 * Docking and undocking at the same offset makes the header flicker when the
 * scroll comes to rest right on the threshold, so the two edges are separated.
 */
const DOCK_AT = 64;
const UNDOCK_AT = 24;

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

  // Fixed shell + `container`: island insets are measured from the content
  // column, not the viewport, so the header tracks the content at any width.
  return (
    <header>
      {/* First in the DOM, and the header is the first thing the public layout
          renders — so this is the document's first tab stop. */}
      <PublicHeaderSkipLink />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div className="container relative">
          <HeaderIsland side="left" docked={docked} geometry={geometry}>
            <PublicHeaderMainNav
              items={globalConfig.header.nav}
              minimized={docked}
            />
          </HeaderIsland>

          <HeaderIsland side="right" docked={docked} geometry={geometry}>
            <ColorSchemeModeToggle />
            <I18nToggle />
            <UserActionToggle />
          </HeaderIsland>
        </div>
      </div>
    </header>
  );
}
