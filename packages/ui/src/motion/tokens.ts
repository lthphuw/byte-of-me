// Canonical motion tokens for the public site. Every page pulls timings/easing
// from here so animations stay consistent instead of hardcoding magic numbers.

/** Standard animation durations, in seconds. */
export const motionDuration = {
  fast: 0.3,
  base: 0.45,
  slow: 0.6,
} as const;

/** Named cubic-bezier easing curves. Typed as mutable tuples so they satisfy
 *  framer-motion's cubic-bezier easing type. */
export const motionEase = {
  // Sleek curve already used across the public site — promoted to a token.
  sleek: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

/** Default scroll-reveal viewport: fire once, slightly before fully in view. */
export const motionViewport = { once: true, margin: '-80px' };

/** Stagger delays between sibling items, in seconds. */
export const motionStagger = {
  base: 0.08,
  tight: 0.05,
} as const;
