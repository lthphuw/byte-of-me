/** 18:00, as minutes past midnight — where the raster's clock axis opens. */
export const RASTER_START_MIN = 1080;

/** 18 hours, so the axis closes at 12:00. The six it omits are hours a night
 *  never touches, and spending them would halve the resolution of the rest. */
export const RASTER_SPAN_MIN = 1080;

/** 15:00: past it a clock value belongs to the evening, not to the noon. */
const SNAP_BACK_MIN = 1260;

const DAY_MIN = 1440;

/**
 * Where a clock time falls on the 18:00 → 12:00 axis, in minutes from its left
 * edge. One monotone scale, so 23:40 and 00:20 sit forty minutes apart rather
 * than at opposite ends — `unwrapNearMidnight`'s correction, cut at 15:00.
 */
export function rasterOffset(clockMin: number): number {
  const offset = (((clockMin - RASTER_START_MIN) % DAY_MIN) + DAY_MIN) % DAY_MIN;

  if (offset <= RASTER_SPAN_MIN) return offset;

  // Inside the omitted six hours: clamp to whichever end it is nearer, so a
  // 16:00 bedtime draws at the left edge rather than wrapping to the right.
  return offset >= SNAP_BACK_MIN ? 0 : RASTER_SPAN_MIN;
}
