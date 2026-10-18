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
   * Padding for an island of icon buttons: smaller, because a 44px touch target already
   * carries 10px around its 24px mark, and the general value on top reads as a gap.
   */
  paddingXIcons: number;
  height: number;
  radius: number;
}

/**
 * Alignment: at rest the TEXT sits on the content column (inset 0 + padding 32); docked, the
 * card EDGE does (inset 32), the line every page card starts on.
 */
const AT_REST: IslandGeometry = {
  top: 0,
  inset: 0,
  paddingX: 32,
  paddingXIcons: 32,
  height: 56,
  radius: 0,
};

/** The phone gutter is 16px, so text and card edge both sit 16px in; 48px of chrome, not 56. */
const AT_REST_MOBILE: IslandGeometry = {
  ...AT_REST,
  paddingX: 16,
  paddingXIcons: 16,
  height: 48,
};

/**
 * `top + height` is 48 here and in `AT_REST_MOBILE` on purpose: the nav popover
 * hangs off that one sum instead of branching on `docked`. Change either and
 * `public-header-mobile-nav` needs the new total.
 */
const DOCKED_MOBILE: IslandGeometry = {
  top: 6,
  inset: 16,
  paddingX: 12,
  paddingXIcons: 4,
  height: 42,
  radius: 12,
};

const DOCKED_DESKTOP: IslandGeometry = {
  top: 16,
  inset: 32,
  paddingX: 16,
  paddingXIcons: 8,
  height: 48,
  radius: 14,
};

/**
 * Critically damped (ζ ≈ 1.0): the island arrives and stops. Underdamped (ζ ≈ 0.65)
 * overshot and wobbled back on every dock, which is unstable on page chrome.
 */
const DOCK_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

/**
 * `top-0 h-12 px-4 md:h-14 md:px-8 rounded-none` restates AT_REST: under `<LazyMotion>` no inline style exists
 * until the features chunk lands, so the header would paint collapsed, then snap into place.
 * `absolute`, not `fixed`: insets are measured from PublicSiteHeader's wrapper, not the viewport.
 */
const ISLAND_BASE =
  'pointer-events-auto flex h-12 min-w-0 items-center gap-1 rounded-none border px-4 md:h-14 md:gap-2 md:px-8 transition-[background-color,border-color,box-shadow] duration-300 ease-out';

/**
 * No `backdrop-filter` in either state: a blurred island re-samples the page
 * behind it on every scroll frame, and the fill below is solid instead.
 */
const ISLAND_AT_REST = 'border-transparent bg-transparent shadow-none';

/**
 * Dark mode swaps the soft shadow for a hairline highlight and a deeper one: black vanishes on
 * near-black. A class swap, not an animated `boxShadow`: it cross-fades in CSS off the `dark`
 * class, so no `resolvedTheme` branch and no hydration-sensitive shadow.
 */
const ISLAND_DOCKED =
  'container-bg border-border shadow-[0_2px_6px_-2px_rgb(0_0_0/0.08),0_8px_24px_-12px_rgb(0_0_0/0.18)] dark:shadow-[0_8px_24px_-12px_rgb(0_0_0/0.7)]';

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
 * Docks a row of islands as a unit: one animated `top`/`right`, flex inside, so none can overlap.
 * At rest the group carries the outer padding, islands none (docked: reverse), or it is doubled.
 * `gap` is a class so the row lays out before `<LazyMotion>` has loaded its features.
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

interface HeaderIslandProps {
  /** Viewport edge the island is pinned to. */
  side: 'left' | 'right';
  docked: boolean;
  geometry: IslandGeometry;
  /**
   * `false` inside a group that positions its islands with flex. Per-island `left`/`right` are
   * animated, so on a cold load (LazyMotion chunk not yet loaded, no inline style) every
   * right-pinned island stacked in one corner.
   */
  pinned?: boolean;
  /**
   * Overrides `geometry.paddingX` on one side. Closes the gap between adjacent islands at rest:
   * with no card drawn, 32px on each facing edge floated the controls a third of the header away.
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
