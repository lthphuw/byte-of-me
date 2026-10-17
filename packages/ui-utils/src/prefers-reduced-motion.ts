/**
 * Whether the OS asks for reduced motion, read at call time rather than as a
 * hook: callers are event handlers (some not React at all) and need the value
 * at the instant they scroll. `false` on the server, where nothing scrolls.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The `scrollIntoView` behavior for a programmatic jump. CSS `scroll-behavior: auto` in a
 * reduced-motion query does NOT cover it: an explicit `behavior: 'smooth'` in JS always
 * animates, so the check has to happen in the caller.
 */
export function scrollIntoViewBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
