import { stagger, type Variants } from 'framer-motion';

import { motionDuration, motionEase, motionStagger } from './tokens';

/**
 * Gap between siblings for a list of `count`: the full `motionStagger.step`,
 * shrunk so the last item never starts later than `motionStagger.budget`.
 */
export function staggerStep(count: number): number {
  return Math.min(
    motionStagger.step,
    motionStagger.budget / Math.max(count - 1, 1)
  );
}

/**
 * A section arriving on scroll, below the fold: fade and a short rise. Accepts
 * an optional `custom` delay: `<m.div custom={0.1} variants={fadeUp} />`.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDuration.base,
      ease: motionEase.out,
      delay,
    },
  }),
};

/** The first block of a page: a touch further and a touch slower than `fadeUp`. */
export const entranceUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDuration.slow,
      ease: motionEase.out,
      delay,
    },
  }),
};

/** Plain opacity fade, no movement — a result set swapping in. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: {
      duration: motionDuration.fast,
      ease: motionEase.out,
      delay,
    },
  }),
};

/**
 * Container that staggers its children; `count` sizes the step so the whole
 * list stays inside the stagger budget. Children use `staggerItem` (or any
 * variant with matching `hidden`/`visible` keys).
 */
export const staggerContainer = (
  count: number,
  delayChildren = 0
): Variants => ({
  hidden: {},
  visible: {
    transition: {
      delayChildren: stagger(staggerStep(count), { startDelay: delayChildren }),
    },
  },
});

/** Item paired with `staggerContainer`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.base, ease: motionEase.out },
  },
};

// Define icon animation switch variants
export const iconSwitchVariants = {
  initial: { opacity: 0, scale: 0.8, rotate: 90 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.8, rotate: -90 },
};
