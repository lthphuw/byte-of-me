import type { CorrelationResult } from '@/shared/lib/health/correlation';

/**
 * The shapes the correlation read hands back.
 *
 * `import type` only, so nothing in `shared/lib/health/correlation.ts`
 * survives into a client bundle — the declaration is erased at compile time,
 * exactly as `sleep-log/model/types.ts` imports `SleepNight`. The statistics
 * themselves are computed in the action.
 */

/** One day with a sleep record, and the training that followed it — the raw
 *  points a scatter plot draws, alongside the coefficients. */
export interface SleepTrainingPoint {
  /** `YYYY-MM-DD`. The day the sleep ENDED, which is the day the training it
   *  is paired with STARTED. */
  localDate: string;
  totalSleepMin: number;
  /** Null on a rest day. NOT zero: a rest day is not a session that produced
   *  no tonnage. */
  volumeLoadKg: number | null;
  /** Mean RPE over the day's working sets, null when none recorded one. */
  meanRpe: number | null;
  trained: boolean;
}

export interface SleepTrainingCorrelation {
  /** The window actually queried, `YYYY-MM-DD`, inclusive at both ends. */
  from: string;
  to: string;

  /** Sleep duration against training volume load, over days that trained. */
  volumeLoad: CorrelationResult | null;
  /** Sleep duration against mean working-set RPE, over days that trained and
   *  recorded one. */
  meanRpe: CorrelationResult | null;
  /** Sleep duration against whether training happened, over EVERY logged day —
   *  the one measure where a rest day is an observation rather than a gap. */
  trained: CorrelationResult | null;

  /**
   * Paired days a coefficient needs before it is reported, carried in the
   * payload rather than imported.
   *
   * The screen has to be able to say "not enough data yet, 7 of 20 paired
   * days" instead of a bare "unavailable", and importing the constant from
   * `shared/lib/health/correlation.ts` to render that sentence would pull the
   * whole statistics module into the browser bundle for the sake of one
   * integer.
   */
  minPairs: number;

  /** Days with both a sleep record and at least one finished session. */
  pairedDays: number;
  /** Days with a sleep record and no session. */
  sleepOnlyDays: number;
  /** Days that trained on an unlogged night. They enter no measure — there is
   *  no predictor — and are reported so a screen can explain why these counts
   *  do not add up to the training history it shows elsewhere. */
  sessionOnlyDays: number;

  points: SleepTrainingPoint[];
}
