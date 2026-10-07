// Canonical motion tokens for the public site. Every page pulls timings/easing
// from here so animations stay consistent instead of hardcoding magic numbers.
// The rules and their sources: .claude/rules/motion.md.

/** Standard animation durations, in seconds. */
export const motionDuration = {
  /** Press feedback. */
  press: 0.12,
  /** Hover, state change, exit, and the fade of a filter or page swap. */
  fast: 0.18,
  /** Enter: a card, a section, a menu. */
  base: 0.3,
  /** A page entrance. The ceiling: nothing UI-level runs longer. */
  slow: 0.4,
} as const;

/** Named cubic-bezier easing curves. Typed as mutable tuples so they satisfy
 *  framer-motion's cubic-bezier easing type. */
export const motionEase = {
  // The gentle curve the tab pill and Show more already use — kept as a token.
  sleek: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
  // Enter: strong ease-out. Mirrored in tailwind.config as `ease-enter`.
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  // Exit: accelerates away. Mirrored in tailwind.config as `ease-exit`.
  in: [0.3, 0, 1, 1] as [number, number, number, number],
};

/** Default scroll-reveal viewport: fire once, slightly before fully in view. */
export const motionViewport = { once: true, margin: '-80px' };

/**
 * Stagger between sibling items, in seconds. `step` is the gap for a short
 * list; `budget` caps how late the last item may start whatever the length.
 */
export const motionStagger = {
  step: 0.05,
  budget: 0.3,
} as const;
