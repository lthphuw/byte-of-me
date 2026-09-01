const DAY_MIN = 1440;
const HALF_DAY_MIN = 720;

/** A wake clock at or past 15:00 is the am/pm slip, not a nap that ended in
 *  the afternoon — the pair is only inspected once it already claims more than
 *  twelve hours in bed. */
const AFTERNOON_MIN = 900;
const EARLY_MORNING_MIN = 300;

/** 14h. Long enough that a typed pair is worth questioning, short enough that
 *  an ill or catching-up night still fits under it. */
export const LONG_NIGHT_MIN = 840;

export interface ClockRepair {
  field: 'bed' | 'wake';
  /** Minutes past local midnight. */
  corrected: number;
}

/**
 * The two twelve-hour slips a typed clock pair actually makes.
 *
 * `bed ≤ wake` needs no repair — the duration is taken the short way round, so
 * the pair can never be inverted. What it can be is off by half a day: 07:00
 * entered as 19:00, or 23:00 entered as 11:00. Both show up as more than
 * twelve hours in bed with the offending clock in a window the other reading
 * would never land in, which is what makes the correction safe to apply.
 *
 * Returns null when the pair is plausible, so the caller can leave it alone.
 */
export function repairNight(
  bedMin: number,
  wakeMin: number
): ClockRepair | null {
  const timeInBed = (((wakeMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  if (timeInBed <= HALF_DAY_MIN) return null;

  if (wakeMin >= AFTERNOON_MIN) {
    return { field: 'wake', corrected: wakeMin - HALF_DAY_MIN };
  }

  if (bedMin >= EARLY_MORNING_MIN && bedMin <= AFTERNOON_MIN) {
    return { field: 'bed', corrected: bedMin + HALF_DAY_MIN };
  }

  return null;
}
