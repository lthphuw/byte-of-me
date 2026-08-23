/**
 * Shared between `BootSplashScript` (writes it) and `BootSplashReady` (reads
 * and writes it). `sessionStorage` scopes to the tab, which is exactly the
 * unit "once per browser session" needs: a reload of the same tab keeps the
 * flag, a brand-new tab does not.
 */
export const BOOT_SPLASH_SESSION_KEY = 'boot-splash-shown';

/**
 * The attribute `BootSplashScript` sets on `<html>` before first paint and
 * `BootSplashReady` clears once the app is ready. Mirrored in the
 * `html[data-booting]` selector in `globals.css` — keep the two in step if
 * this ever changes.
 */
export const BOOT_SPLASH_ATTRIBUTE = 'data-booting';

/**
 * The splash never disappears before this many ms, so a fast connection does
 * not get a one-frame strobe.
 */
export const BOOT_SPLASH_FLOOR_MS = 400;

/**
 * The splash never lingers past this many ms, so a hung font request can
 * never trap someone on the splash screen. Not optional.
 */
export const BOOT_SPLASH_CEILING_MS = 2500;
