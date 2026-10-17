'use client';

import { useEffect } from 'react';

import {
  BOOT_SPLASH_ATTRIBUTE,
  BOOT_SPLASH_CEILING_MS,
  BOOT_SPLASH_FLOOR_MS,
  BOOT_SPLASH_SESSION_KEY,
} from './constants';

/**
 * Dismisses the splash once mounted and fonts are ready, floored at BOOT_SPLASH_FLOOR_MS (no strobe on
 * a fast connection) and capped at BOOT_SPLASH_CEILING_MS (a hung font request cannot trap anyone).
 * Removing `data-booting` triggers the CSS fade in globals.css; it runs once per hard load.
 */
export function BootSplashReady() {
  useEffect(() => {
    let dismissed = false;
    const start = Date.now();
    const timers: number[] = [];

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      try {
        sessionStorage.setItem(BOOT_SPLASH_SESSION_KEY, '1');
        document.documentElement.removeAttribute(BOOT_SPLASH_ATTRIBUTE);
      } catch {
        // Some privacy modes throw on any `sessionStorage` access. The
        // splash simply doesn't get to fade out gracefully here — but the
        // ceiling timer below still fires, so it never stays stuck.
      }
    }

    function afterFloor() {
      const elapsed = Date.now() - start;
      timers.push(
        window.setTimeout(dismiss, Math.max(0, BOOT_SPLASH_FLOOR_MS - elapsed))
      );
    }

    const fontsReady =
      typeof document !== 'undefined' && document.fonts
        ? document.fonts.ready
        : Promise.resolve();

    fontsReady.then(afterFloor, afterFloor);

    timers.push(window.setTimeout(dismiss, BOOT_SPLASH_CEILING_MS));

    return () => {
      dismissed = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
