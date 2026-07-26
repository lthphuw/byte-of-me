'use client';

import type { ReactNode } from 'react';
import { useMediaQuery } from '@byte-of-me/ui';
import { m, type Transition } from 'framer-motion';

import { cn } from '@/shared/lib/utils';

/**
 * The public header is two islands pinned to opposite edges of the content column —
 * navigation on the left, controls on the right. Both share this component so
 * they can never dock out of sync or at different elevations.
 */
export interface IslandGeometry {
  /** Distance from the top of the viewport. */
  top: number;
  /** Distance from the edge the island is pinned to. */
  inset: number;
  /** Inline padding, i.e. how far the content sits inside the island. */
  paddingX: number;
  height: number;
  radius: number;
}

/**
 * Alignment contract: at rest the island is invisible, so its TEXT sits on the
 * content column (inset 0 + padding 32). Docked it becomes a visible card, so
 * its EDGE sits on the content column (inset 32) — same line every page card
 * starts on.
 */
const AT_REST: IslandGeometry = {
  top: 0,
  inset: 0,
  paddingX: 32,
  height: 64,
  radius: 0,
};

// `top + height` stays 64px so the mobile nav popover hangs off one offset.
const DOCKED_MOBILE: IslandGeometry = {
  top: 12,
  inset: 32,
  paddingX: 16,
  height: 52,
  radius: 14,
};

const DOCKED_DESKTOP: IslandGeometry = {
  top: 24,
  inset: 32,
  paddingX: 16,
  height: 56,
  radius: 16,
};

/**
 * Critically damped (ζ ≈ 1.0): the island arrives and stops. The previous
 * spring was underdamped (ζ ≈ 0.65), so every dock overshot and wobbled back —
 * playful on a card, unstable on page chrome.
 */
const DOCK_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

/**
 * `top-0 h-16 px-8 rounded-none` restates AT_REST as utilities. Under
 * `<LazyMotion>` the animation features arrive in a separate chunk, so until it
 * lands the element carries no inline style at all — without these the header
 * paints collapsed against the container edge and then snaps into place on
 * every cold load. Framer's inline styles override them the moment it takes
 * over, with identical values, so nothing moves.
 *
 * `absolute`, not `fixed`: insets are measured from the container-aligned
 * wrapper in PublicSiteHeader, not the viewport.
 */
const ISLAND_BASE =
  'pointer-events-auto absolute top-0 flex h-16 min-w-0 items-center gap-2 rounded-none border px-8 backdrop-invert-0 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out';

/**
 * `backdrop-blur-[0px]`, not `backdrop-blur-none`: the latter compiles to an
 * empty blur, leaving the two states with different backdrop-filter function
 * lists, which the browser cannot interpolate — the blur would snap in while
 * the background and border faded.
 */
const ISLAND_AT_REST =
  'border-transparent bg-transparent shadow-none backdrop-blur-[0px] backdrop-saturate-100';

/**
 * Light mode carries a soft two-layer shadow. Dark mode drops it to a hairline
 * highlight plus a much deeper shadow, because a black shadow is invisible
 * against a near-black background — the reason the previous implementation
 * reached for a white glow, a treatment nothing else in the app uses.
 *
 * Kept as a class swap rather than an animated `boxShadow` value so the surface
 * cross-fades in CSS and reads the theme straight from the `dark` class. No
 * `resolvedTheme` branch, so no hydration-sensitive shadow.
 */
const ISLAND_DOCKED =
  'container-bg border-black/[0.06] shadow-[0_2px_6px_-2px_rgb(0_0_0/0.08),0_8px_24px_-12px_rgb(0_0_0/0.18)] dark:border-white/10 dark:shadow-[0_8px_24px_-12px_rgb(0_0_0/0.7)]';

/**
 * Resolves the geometry both islands animate to. Called once by the header so
 * the two islands are always driven by the exact same numbers.
 */
export function useIslandGeometry(docked: boolean): IslandGeometry {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!docked) return AT_REST;
  return isDesktop ? DOCKED_DESKTOP : DOCKED_MOBILE;
}

export interface HeaderIslandProps {
  /** Viewport edge the island is pinned to. */
  side: 'left' | 'right';
  docked: boolean;
  geometry: IslandGeometry;
  children: ReactNode;
}

export function HeaderIsland({
  side,
  docked,
  geometry,
  children,
}: HeaderIslandProps) {
  return (
    <m.div
      animate={{
        top: geometry.top,
        // Only the pinned edge is animated; the opposite one stays `auto` so
        // the island sizes to its own content and never covers — or swallows
        // clicks meant for — the page behind it.
        left: side === 'left' ? geometry.inset : undefined,
        right: side === 'right' ? geometry.inset : undefined,
        height: geometry.height,
        // Explicit units: framer defaults bare numbers to px only for
        // positional and transform values, so a numeric padding resolves to the
        // unitless string "32" and is dropped as non-animatable.
        paddingLeft: `${geometry.paddingX}px`,
        paddingRight: `${geometry.paddingX}px`,
        borderRadius: geometry.radius,
      }}
      transition={DOCK_TRANSITION}
      className={cn(
        ISLAND_BASE,
        side === 'left' ? 'left-0' : 'right-0',
        docked ? ISLAND_DOCKED : ISLAND_AT_REST
      )}
    >
      {children}
    </m.div>
  );
}
