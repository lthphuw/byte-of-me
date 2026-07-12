import type { Variants } from 'framer-motion';

import { motionDuration, motionEase, motionStagger } from './tokens';

/**
 * Scroll-reveal fade + upward slide. Accepts an optional `custom` delay so
 * callers can offset a section: `<m.div custom={0.1} variants={fadeUp} />`.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDuration.slow,
      ease: motionEase.sleek,
      delay,
    },
  }),
};

/** Plain opacity fade, no movement. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: {
      duration: motionDuration.base,
      ease: motionEase.sleek,
      delay,
    },
  }),
};

/**
 * Container that staggers its children. Children should use `staggerItem`
 * (or any variant with matching `hidden`/`visible` keys).
 */
export const staggerContainer = (
  stagger: number = motionStagger.base,
  delayChildren = 0
): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Item paired with `staggerContainer`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.base, ease: motionEase.sleek },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 130,
      damping: 10,
    },
  }),
  exit: { opacity: 0, y: 10 },
};

// Define icon animation switch variants
export const iconSwitchVariants = {
  initial: { opacity: 0, scale: 0.8, rotate: 90 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.8, rotate: -90 },
};

export const menuVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -4 },
};
