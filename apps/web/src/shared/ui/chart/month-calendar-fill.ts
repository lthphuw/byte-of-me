/**
 * The four fill steps, in ascending value order.
 *
 * These alphas are MEASURED, not a linear ramp. A tidy 25/50/75/100 looks even
 * as numbers and is not even as light: sRGB is gamma-encoded, so equal alpha
 * steps bunch up at the dark end and spread at the light end, and the two
 * lightest dots end up closer together than any other pair.
 *
 * Composited over `--card` and converted to CIE L*, these four land at
 * roughly 75 / 53 / 34 / 8 in the light theme and 35 / 59 / 77 / 98 in the
 * dark one — steps of 19–27 L* everywhere, against a ~10 L* floor for
 * confident discrimination. The lightest step also has to separate from the
 * sheet it sits on: 75 against the card's 100 is a 25-point gap, so an unlit
 * short night still reads as a mark rather than as nothing.
 *
 * `--primary` rather than a hardcoded grey, so one ramp is correct in both
 * themes — it is near-black in light and near-white in dark, and the card
 * behind it flips with it.
 *
 * Exported because the sleep screen's month grid is a control rather than a
 * drawing and therefore cannot sit inside `ChartFrame` (a focusable button in
 * an `aria-hidden` subtree is the `aria-hidden-focus` failure). It draws the
 * same marks against the same ramp, and a second copy of these four alphas
 * would be a second copy of the measurement that produced them.
 */
export const MONTH_CALENDAR_FILL = [
  'bg-primary/30',
  'bg-primary/55',
  'bg-primary/75',
  'bg-primary',
] as const;

export const MONTH_CALENDAR_LEVELS = MONTH_CALENDAR_FILL.length;
