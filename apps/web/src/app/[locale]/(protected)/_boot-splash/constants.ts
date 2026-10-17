/**
 * Shared by BootSplashScript and BootSplashReady. `sessionStorage` is per tab, the unit "once per
 * browser session" needs: a reload keeps the flag, a new tab does not.
 */
export const BOOT_SPLASH_SESSION_KEY = 'boot-splash-shown';

/**
 * Set on `<html>` before first paint, cleared when ready. Mirrored by the `html[data-booting]` selector
 * in globals.css: keep the two in step.
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
