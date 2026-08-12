/**
 * Whether the user has asked the OS to reduce motion, read at call time.
 *
 * Deliberately a plain read rather than a hook. Every caller is an event
 * handler that needs the value at the instant it scrolls — not a value that
 * re-renders a component when the setting flips — and two of the call sites
 * (the editor's search-and-replace helpers) are not React at all, so
 * `useMediaQuery` could not reach them.
 *
 * Returns `false` during SSR: `window.matchMedia` does not exist there, and
 * nothing scrolls on the server anyway.
 */
export function prefersReducedMotion(): boolean {
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
