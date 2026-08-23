import { BOOT_SPLASH_ATTRIBUTE, BOOT_SPLASH_SESSION_KEY } from './constants';

/**
 * Sets `data-booting` on `<html>` synchronously, before first paint, so the
 * CSS-only overlay in `BootSplashOverlay` is visible from the very first
 * frame instead of flashing in after the content it was meant to cover.
 *
 * Neither of the obvious React approaches works here:
 *  - A `useEffect` that reads `sessionStorage` runs after the first paint,
 *    so the splash would appear only once the content is already on screen.
 *  - Reading `sessionStorage` during render breaks hydration: the server has
 *    no `sessionStorage`, and React 19 discards the whole subtree on a
 *    server/client mismatch.
 *
 * A synchronous inline `<script>` is the only thing that runs early enough
 * and is invisible to hydration, because it mutates a DOM attribute rather
 * than React state — there is nothing for the hydration diff to disagree
 * about.
 */
export function BootSplashScript() {
  const script = `(function(){try{if(!sessionStorage.getItem(${JSON.stringify(
    BOOT_SPLASH_SESSION_KEY
  )})){document.documentElement.setAttribute(${JSON.stringify(
    BOOT_SPLASH_ATTRIBUTE
  )},'');}}catch(e){}})();`;

  // Static content, no user input — the same pattern as `JsonLd`, and the
  // standard flash-prevention idiom.
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
