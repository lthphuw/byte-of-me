/**
 * The shapes the gym statistics reads hand back.
 *
 * No `import type` from `shared/lib/health/workout-stats.ts` and no `Date`
 * anywhere: a server action's return value is serialized, so every day is a
 * `YYYY-MM-DD` string and every `Decimal` is already a number by the time it
 * gets here (`shared/lib/decimal.ts`).
 *
 * **Every threshold a measure is gated on travels in the payload.** The screen
 * has to be able to say "needs 8 sessions in the last 28 days, 5 so far"
 * rather than a bare "unavailable", and importing `ACWR_MIN_CHRONIC_SESSIONS`
 * to render that sentence would pull the whole statistics module into the
 * browser bundle for the sake of one integer — the same reasoning
 * `SleepTrainingCorrelation.minPairs` is carried for.
 */

/** One trailing seven-day bucket of the training window. */
export interface GymWeekBucket {
  /** `YYYY-MM-DD` of the LAST day in the bucket, inclusive. */
  weekEnd: string;
  /** Tonnage over working `weight_reps` sets. Zero is a real zero here: the
   *  bucket exists whether or not it was trained in. */
  volumeLoadKg: number;
  /** Finished sessions that started inside the bucket. */
  sessions: number;
  /**
   * Foster session-RPE load summed over the sessions that have one, or null
   * when NONE of the bucket's sessions do. Null rather than 0, because a week
   * of sessions nobody rated is not a week of effortless training.
   */
  load: number | null;
  /** Sessions whose load could be computed, and those whose could not — one
   *  of `sessionRpe` or the finish time was missing. */
  loadKnown: number;
  loadUnknown: number;
}

/** Weekly hard-set exposure for one muscle. Fractional, because a secondary
 *  muscle is credited `secondaryCredit` of a set. */
export interface MuscleHardSets {
  /** A `Muscle` code from `@byte-of-me/db/gym-vocabulary`, typed `string`
   *  because that is what the column holds — see `labelForCode`. */
  muscle: string;
  sets: number;
}

/**
 * The acute:chronic workload ratio, with everything the screen needs to
 * explain a null.
 *
 * The ratio is null for two different reasons and the copy differs: too few
 * sessions with a computable load in the chronic window, or a chronic window
 * whose total load is zero. Both counts are here so the screen can tell them
 * apart without guessing.
 */
export interface AcwrReading {
  ratio: number | null;
  acuteDays: number;
  chronicDays: number;
  acuteLoad: number;
  acuteKnown: number;
  acuteUnknown: number;
  chronicLoad: number;
  chronicKnown: number;
  chronicUnknown: number;
  /** `ACWR_MIN_CHRONIC_SESSIONS`, carried rather than imported. */
  minChronicSessions: number;
}

export interface E1rmSeriesPoint {
  /** `YYYY-MM-DD` of the training day. */
  localDate: string;
  e1rmKg: number;
  /**
   * True when this point beats every earlier point IN THIS WINDOW.
   *
   * A running maximum, not `personalRecords().bestE1rm` — that returns the
   * single best and a chart wants the whole staircase. It is a presentation
   * fact rather than a statistic, which is why it is computed at the read
   * boundary and not in `workout-stats.ts`. The window is stated on screen
   * beside it, because the first point of any window trivially satisfies it.
   */
  isRecord: boolean;
}

/** One exercise's e1RM progression over the window. */
export interface ExerciseProgression {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  metric: string;
  /** Sessions in the window that included this exercise at all. */
  sessionCount: number;
  /**
   * Best RELIABLE e1RM per training DAY, oldest first.
   *
   * A day that produced no reliable estimate is absent rather than zero, and
   * two sessions on one day are folded into their better estimate — the chart
   * this feeds is keyed and labelled by day, so a repeated date would be one
   * key with two values (`toE1rmSeriesPoints`).
   */
  points: E1rmSeriesPoint[];
  /**
   * Sessions of this exercise whose working sets produced ONLY estimates above
   * the reliable rep ceiling, so nothing was plotted for them.
   *
   * Carried so the chart can explain its own gaps: "you trained it, the
   * estimate is not trustworthy" is a different statement from "you did not
   * train it", and a bare gap says the second.
   */
  unreliableOnlySessions: number;
  /** kg per SESSION, over the last `slopeWindowSessions` points. Null below
   *  `minSlopeSessions`. */
  slopeKgPerSession: number | null;
  /** `OVERLOAD_MIN_SESSIONS`, carried rather than imported. */
  minSlopeSessions: number;
  /** How many points the slope would have been taken over — what the screen
   *  compares against `minSlopeSessions` when the slope is null. */
  slopeSessions: number;
  bestE1rmKg: number | null;
  bestE1rmDate: string | null;
}

export interface GymStats {
  /** The window actually read, `YYYY-MM-DD`, inclusive at both ends. */
  from: string;
  to: string;
  days: number;

  /** Finished sessions in the window. Open ones are excluded everywhere here
   *  — see `getGymStats`. */
  finishedSessions: number;

  /** Trailing seven-day buckets, oldest first. */
  weeks: GymWeekBucket[];

  /** The window the per-muscle counts are taken over — one week. */
  hardSetsWindowDays: number;
  /** Descending by exposure. A muscle with no exposure is ABSENT, so the
   *  screen can tell "not trained this week" from "trained". */
  hardSets: MuscleHardSets[];
  /** `SECONDARY_MUSCLE_SET_CREDIT`. A convention this project chose, not a
   *  constant of nature, and the screen says so beside the numbers. */
  secondaryCredit: number;
  /** Schoenfeld's commonly cited hypertrophy range, drawn as a band. */
  hypertrophyBandLow: number;
  hypertrophyBandHigh: number;

  acwr: AcwrReading;

  /** `E1RM_RELIABLE_MAX_REPS`, carried rather than imported. */
  e1rmReliableMaxReps: number;
  /** The most-trained `weight_reps` exercises, most sessions first. */
  progressions: ExerciseProgression[];
  /** How many `weight_reps` exercises were trained in the window in total, so
   *  the screen can say how many are not drawn. */
  progressionTotal: number;
}

/** One working or warm-up set as the detail screen prints it, with the
 *  estimate it produces and whether that estimate can be trusted. */
export interface ExerciseSetReading {
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  durationSec: number | null;
  isWarmup: boolean;
  /** Epley, or null when the set carries no load or no reps. */
  e1rmKg: number | null;
  /** Above `E1RM_RELIABLE_MAX_REPS`. Rendered visibly distinguished, and it
   *  never establishes a record. */
  e1rmUnreliable: boolean;
}

export interface ExerciseSessionReading {
  sessionId: string;
  localDate: string;
  title: string;
  sets: ExerciseSetReading[];
  /** Tonnage this exercise contributed to that session. */
  volumeLoadKg: number;
  /** Best reliable estimate in that session, or null. */
  bestE1rmKg: number | null;
}

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  metric: string;
  isArchived: boolean;

  from: string;
  to: string;
  days: number;

  progression: ExerciseProgression;

  /** Heaviest working set in the window, and the most reps achieved at that
   *  weight. Null when the exercise records no external load. */
  heaviest: {
    weightKg: number;
    reps: number;
    localDate: string;
  } | null;
  bestE1rm: {
    valueKg: number;
    weightKg: number;
    reps: number;
    localDate: string;
  } | null;

  /** Newest first, capped at `sessionCap`. */
  sessions: ExerciseSessionReading[];
  sessionCap: number;
  e1rmReliableMaxReps: number;
}
