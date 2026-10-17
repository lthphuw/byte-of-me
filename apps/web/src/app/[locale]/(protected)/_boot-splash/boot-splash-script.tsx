import { BOOT_SPLASH_ATTRIBUTE, BOOT_SPLASH_SESSION_KEY } from './constants';

/**
 * Sets `data-booting` on `<html>` before first paint so the CSS-only overlay shows from frame one. A
 * useEffect runs after paint and reading sessionStorage in render breaks hydration (React 19 discards
 * the subtree); a sync inline script mutates a DOM attribute, so hydration has nothing to disagree on.
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
