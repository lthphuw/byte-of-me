/** A night, by the only field this rule reads. */
interface DatedNight {
  /** `YYYY-MM-DD`, the day of WAKING. */
  localDate: string;
}

/**
 * The night just slept — the one the entry card offers to log or edit.
 *
 * `localDate` is the day of waking, so the night written after waking today
 * IS today. Never "the most recent row": that is yesterday's night on the
 * morning today has not been logged, which is exactly when the card matters.
 */
export function lastNightOf<T extends DatedNight>(
  nights: readonly T[],
  todayKey: string
): T | null {
  return nights.find((night) => night.localDate === todayKey) ?? null;
}
