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
  /**
   * Padding for an island of icon buttons. Smaller, because a 44px touch
   * target already carries 10px around its 24px mark — the general value on
   * top of that reads as a gap, while the same value around a wordmark is
   * what stops it touching the edge.
   */
  paddingXIcons: number;
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
  paddingXIcons: 32,
  height: 64,
  radius: 0,
};

/** 64px of chrome is a tenth of a phone screen; the number was inherited. */
const AT_REST_MOBILE: IslandGeometry = { ...AT_REST, height: 56 };

/**
 * `top + height` is 56 here and in `AT_REST_MOBILE` on purpose: the nav popover
 * hangs off that one sum instead of branching on `docked`. Change either and
 * `public-header-mobile-nav` needs the new total.
 */
const DOCKED_MOBILE: IslandGeometry = {
  top: 8,
  inset: 32,
  paddingX: 14,
  paddingXIcons: 6,
  height: 48,
  radius: 14,
};

const DOCKED_DESKTOP: IslandGeometry = {
  top: 24,
  inset: 32,
  paddingX: 16,
  paddingXIcons: 12,
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
  'pointer-events-auto flex h-16 min-w-0 items-center gap-1 rounded-none border px-8 md:gap-2 backdrop-invert-0 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out';

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

  if (!docked) return isDesktop ? AT_REST : AT_REST_MOBILE;
  return isDesktop ? DOCKED_DESKTOP : DOCKED_MOBILE;
}

/**
 * Pins a row of islands to one edge and docks them as a unit.
 *
 * The right edge carries two — preferences, then the account — and they have
 * to arrive and leave together. Positioning the group once and letting flex
 * lay the islands out inside it is what guarantees that: there is one animated
 * `top`/`right` between them, so they cannot dock out of step, and no
 * arithmetic anywhere that could put one on top of the other.
 *
 * The group also owns the OUTER padding while the islands are at rest. That
 * padding is what pulls an island's contents back onto the content column —
 * `inset: 0` sits on the container's border edge, 32px outside it — and it has
 * to be applied exactly once across the row. Left on each island it would be
 * counted twice and open a gutter in the middle; stripped from the outermost
 * one it would leave the row hanging off the edge of the page. So at rest the
 * group carries it and the islands carry none, and docked, where every island
 * is a card that needs its own breathing room, the reverse.
 *
 * `gap` is a class rather than an animated value so the row is laid out
 * correctly before `<LazyMotion>` has fetched its features.
 */
export function HeaderIslandGroup({
  side,
  docked,
  geometry,
  className,
  children,
}: {
  side: 'left' | 'right';
  docked: boolean;
  geometry: IslandGeometry;
  className?: string;
  children: ReactNode;
}) {
  const outerPadding = docked ? 0 : geometry.paddingX;

  return (
    <m.div
      animate={{
        top: geometry.top,
        left: side === 'left' ? geometry.inset : undefined,
        right: side === 'right' ? geometry.inset : undefined,
        paddingLeft: `${side === 'left' ? outerPadding : 0}px`,
        paddingRight: `${side === 'right' ? outerPadding : 0}px`,
      }}
      transition={DOCK_TRANSITION}
      className={cn(
        'pointer-events-none absolute top-0 flex items-start',
        side === 'left' ? 'left-0' : 'right-0',
        className
      )}
    >
      {children}
    </m.div>
  );
}

export interface HeaderIslandProps {
  /** Viewport edge the island is pinned to. */
  side: 'left' | 'right';
  docked: boolean;
  geometry: IslandGeometry;
  /**
   * Set `false` for an island that sits inside a group which does its own
   * positioning. The right edge carries two — preferences, then the account —
   * and they are laid out by a flex row rather than by each island pinning
   * itself, so neither can ever be drawn on top of the other.
   *
   * Flex rather than an offset measured from the outer island's width, which
   * is what this tried first: `left`/`right` are animated by framer, and under
   * `<LazyMotion>` the features arrive in a separate chunk, so on a cold load
   * there is a window with no inline styles at all — and every right-pinned
   * island stacked in the same corner until it landed.
   */
  pinned?: boolean;
  /**
   * Overrides `geometry.paddingX` on one side. Used to close the gap between
   * two adjacent islands while they are at rest and invisible: with no card
   * drawn there is nothing to pad, and 32px on each of the facing edges left
   * the controls floating a third of the way across the header away from the
   * avatar they sit beside.
   */
  padding?: { left?: number; right?: number };
  /** Handed the island's own element, for a caller that needs to measure it. */
  innerRef?: (element: HTMLDivElement | null) => void;
  children: ReactNode;
}

export function HeaderIsland({
  side,
  docked,
  geometry,
  pinned = true,
  padding,
  innerRef,
  children,
}: HeaderIslandProps) {
  return (
    <m.div
      ref={innerRef}
      animate={{
        // A grouped island leaves all three to its group: animating `top` here
        // too would fight the wrapper for the same pixels.
        top: pinned ? geometry.top : undefined,
        // Only the pinned edge is animated; the opposite one stays `auto` so
        // the island sizes to its own content and never covers — or swallows
        // clicks meant for — the page behind it.
        left: pinned && side === 'left' ? geometry.inset : undefined,
        right: pinned && side === 'right' ? geometry.inset : undefined,
        height: geometry.height,
        // Explicit units: framer defaults bare numbers to px only for
        // positional and transform values, so a numeric padding resolves to the
        // unitless string "32" and is dropped as non-animatable.
        paddingLeft: `${padding?.left ?? geometry.paddingX}px`,
        paddingRight: `${padding?.right ?? geometry.paddingX}px`,
        borderRadius: geometry.radius,
      }}
      transition={DOCK_TRANSITION}
      className={cn(
        ISLAND_BASE,
        pinned
          ? cn('absolute top-0', side === 'left' ? 'left-0' : 'right-0')
          : 'relative',
        docked ? ISLAND_DOCKED : ISLAND_AT_REST
      )}
    >
      {children}
    </m.div>
  );
}
