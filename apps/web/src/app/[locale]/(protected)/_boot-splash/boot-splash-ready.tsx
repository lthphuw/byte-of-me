'use client';

import { useEffect } from 'react';

import {
  BOOT_SPLASH_ATTRIBUTE,
  BOOT_SPLASH_CEILING_MS,
  BOOT_SPLASH_FLOOR_MS,
  BOOT_SPLASH_SESSION_KEY,
} from './constants';

/**
 * Waits for the app to actually be ready, then dismisses the splash and
 * remembers it for the rest of the tab's session.
 *
 * Renders nothing — it only ever touches the DOM outside React, by removing
 * the `data-booting` attribute `BootSplashScript` set on `<html>`.
 * `.app-boot-splash` in `globals.css` transitions on that removal, so the
 * fade-out is pure CSS; this effect only decides *when*.
 *
 * "Ready" is: mounted, plus `document.fonts.ready` resolved, floored at
 * `BOOT_SPLASH_FLOOR_MS` so the splash never strobes on a fast connection,
 * and capped at `BOOT_SPLASH_CEILING_MS` so a hung font request can never
 * trap someone on the splash.
 *
 * This mounts once per `(protected)` layout instance, which persists across
 * client-side navigation within `/space` and `/dashboard` — so it runs once
 * per hard load, not once per page.
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
