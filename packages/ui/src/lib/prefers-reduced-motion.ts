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
 * The `scrollIntoView` behavior to use for a programmatic jump.
 *
 * `scroll-behavior: auto` in a `prefers-reduced-motion` media query does NOT
 * cover these call sites: per spec, CSS only decides the behavior when the
 * caller passes `'auto'` or omits it. An explicit `behavior: 'smooth'` in JS
 * always animates, whatever the stylesheet says — so the check has to happen
 * here, in the caller.
 */
export function scrollIntoViewBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
