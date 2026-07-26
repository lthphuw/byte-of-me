'use client';

import type { ReactNode } from 'react';
import {
  fadeUp,
  motionDuration,
  motionEase,
  motionStagger,
  motionViewport,
  staggerContainer,
  staggerItem,
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

interface RevealSectionProps {
  children: ReactNode;
  /** Extra delay before the reveal starts, in seconds. */
  delay?: number;
  id?: string;
  className?: string;
  /** Animate only the first time it scrolls into view. */
  once?: boolean;
  as?: MotionTag;
}

/**
 * Scroll-reveal fade-up for a page section. Consolidates the previously
 * duplicated per-widget `*SectionMotion` components.
 */
export function RevealSection({
  children,
  delay = 0,
  id,
  className,
  once = true,
  as = 'div',
}: RevealSectionProps) {
  const Comp = MOTION_TAGS[as];
  return (
    <Comp
      id={id}
      className={className}
      custom={delay}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ ...motionViewport, once }}
    >
      {children}
    </Comp>
  );
}

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  as?: MotionTag;
  /** Delay between each child, in seconds. */
  stagger?: number;
  /** Delay before the first child animates, in seconds. */
  delayChildren?: number;
}

/**
 * Scroll-reveal container that staggers its children. Direct children should be
 * `StaggerItem`s (or any motion element using the same variant keys).
 */
export function StaggerList({
  children,
  className,
  as = 'div',
  stagger,
  delayChildren,
}: StaggerListProps) {
  const Comp = MOTION_TAGS[as];
  return (
    <Comp
      className={className}
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={motionViewport}
    >
      {children}
    </Comp>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  as?: MotionTag;
}

/** A single item within a `StaggerList`. */
export function StaggerItem({
  children,
  className,
  as = 'div',
}: StaggerItemProps) {
  const Comp = MOTION_TAGS[as];
  return (
    <Comp className={className} variants={staggerItem}>
      {children}
    </Comp>
  );
}

const MAX_STAGGER_STEPS = 8;

interface RevealItemProps {
  children: ReactNode;
  /** Position in the list — used to stagger the entrance (capped). */
  index?: number;
  className?: string;
  as?: MotionTag;
}

/**
 * Mount-time fade-up for a single item, staggered by `index`. Unlike
 * `StaggerItem` this does not need a container and re-reveals whenever it
 * remounts — suited to client-fetched, paginated grids where each result set
 * should animate in. The stagger step is capped so late items never lag.
 */
export function RevealItem({
  children,
  index = 0,
  className,
  as = 'div',
}: RevealItemProps) {
  const delay = Math.min(index, MAX_STAGGER_STEPS) * motionStagger.base;
  const Comp = MOTION_TAGS[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionDuration.base,
        ease: motionEase.sleek,
        delay,
      }}
    >
      {children}
    </Comp>
  );
}
