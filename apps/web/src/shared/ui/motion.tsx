'use client';

import { type ReactNode, useState, useSyncExternalStore } from 'react';
import {
  entranceUp,
  fadeUp,
  motionDuration,
  motionEase,
  motionStagger,
  motionViewport,
} from '@byte-of-me/ui';
import { m } from 'framer-motion';

// Small set of allowed polymorphic tags. Keeps semantics correct (e.g. an
// <ol>/<li> timeline) without opening up every motion element.
const MOTION_TAGS = {
  div: m.div,
  section: m.section,
  ol: m.ol,
  ul: m.ul,
  li: m.li,
} as const;

type MotionTag = keyof typeof MOTION_TAGS;

const subscribeNever = () => () => {};

/**
 * True only for an `immediate` element on the server or while hydrating; false
 * for anything mounted client-side later. Both snapshots agree when `immediate`
 * is off, so those elements never pay the post-hydration re-render.
 */
function useSkipEntrance(immediate: boolean) {
  return useSyncExternalStore(
    subscribeNever,
    () => false,
    () => immediate
  );
}

interface RevealSectionProps {
  children: ReactNode;
  /** Extra delay before the reveal starts, in seconds. */
  delay?: number;
  id?: string;
  className?: string;
  /** Animate only the first time it scrolls into view. */
  once?: boolean;
  as?: MotionTag;
  /**
   * Above the fold: the server HTML renders visible instead of `opacity: 0`,
   * which Chrome ignores as an LCP candidate until JS reveals it. A later
   * client-side mount (soft navigation) still animates.
   */
  immediate?: boolean;
}

/**
 * Scroll-reveal fade-up for a page section. `immediate` marks the first block of
 * a page and gives it the slightly longer `entranceUp`. A block gets one motion
 * tier: do not nest another animated wrapper inside one.
 */
export function RevealSection({
  children,
  delay = 0,
  id,
  className,
  once = true,
  as = 'div',
  immediate = false,
}: RevealSectionProps) {
  const Comp = MOTION_TAGS[as];
  const skipEntrance = useSkipEntrance(immediate);
  return (
    <Comp
      id={id}
      className={className}
      custom={delay}
      variants={immediate ? entranceUp : fadeUp}
      initial={skipEntrance ? false : 'hidden'}
      whileInView="visible"
      viewport={{ ...motionViewport, once }}
    >
      {children}
    </Comp>
  );
}

// The most steps a mount-time stagger counts: 6 x motionStagger.step is the
// whole 0.3s budget.
const MAX_STAGGER_STEPS = 6;

interface RevealItemProps {
  children: ReactNode;
  /** Position in the list — used to stagger the entrance (capped). */
  index?: number;
  className?: string;
  as?: MotionTag;
  /** Above the fold: skip the entrance in the server HTML. See `RevealSection`. */
  immediate?: boolean;
  /**
   * `false` renders the item plainly, with no entrance. Pass it for anything
   * below the first screen — its entrance would finish before it is seen — and
   * once a grid has played its first result set, so a filter or page change
   * does not replay it. Read once, at mount (see `RevealItem`).
   */
  entrance?: boolean;
}

/**
 * Mount-time fade-up for a single item on the first screen, staggered by
 * `index`; it needs no container. It plays on every remount unless the caller
 * turns `entrance` off, and the stagger is capped so late items never lag.
 */
export function RevealItem({
  children,
  index = 0,
  className,
  as = 'div',
  immediate = false,
  entrance = true,
}: RevealItemProps) {
  const delay = Math.min(index, MAX_STAGGER_STEPS) * motionStagger.step;
  const Comp = MOTION_TAGS[as];
  const skipEntrance = useSkipEntrance(immediate);
  // Frozen at mount: dropping `animate` from a live item makes framer-motion
  // run its removed-value fallback, which interrupts a running entrance.
  const [play] = useState(entrance);

  if (!play) {
    return <Comp className={className}>{children}</Comp>;
  }

  return (
    <Comp
      className={className}
      initial={skipEntrance ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionDuration.base,
        ease: motionEase.out,
        delay,
      }}
    >
      {children}
    </Comp>
  );
}
