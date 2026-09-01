/**
 * Workout statistics: estimated maxima, volume, weekly muscle exposure,
 * training load, and progression.
 *
 * Pure functions over plain arrays — no Prisma types, no I/O — the sibling of
 * `sleep-stats.ts` and `chronobiology.ts`, and it inherits their hard rule:
 * **a measure refuses to answer when the data cannot support it.** A null on
 * screen reads as "not enough logged yet", which is recoverable. A confident
 * number computed from three sets reads as a fact, and the reader has no way
 * to tell the difference.
 *
 * The other rule this file exists to enforce is `isWarmup`. Warm-up sets are
 * excluded from volume, from personal records and from the per-muscle set
 * count. Nobody warms up for a *set* — they warm up for the working sets that
 * follow — so counting them inflates every hypertrophy figure the module
 * produces, and inflates them by a factor that grows with how carefully the
 * lifter warms up. It is the single most important correctness rule here.
 *
 * The vocabularies come from `@byte-of-me/db/gym-vocabulary` and are never
 * redefined: they drifted on five codes the one commit they existed as three
 * hand-synchronised copies, and the failure was silent.
 */
import type { Metric, Muscle } from '@byte-of-me/db/gym-vocabulary';

import { addDays } from './local-date';

/**
 * Epley loses validity above this many reps.
 *
 * The formula is a straight line fitted to the 1–10 rep range; past roughly a
 * dozen reps a set stops being limited by force production and starts being
 * limited by fatigue, and the estimate diverges upward from anything a lifter
 * could actually lift once. Twelve is the conventional edge of that range.
 */
export const E1RM_RELIABLE_MAX_REPS = 12;

/**
 * What one working set contributes to a SECONDARY muscle.
 *
 * **This is a convention this project chose, not a constant of nature.** There
 * is no measurement that says a close-grip press grows the chest exactly half
 * as much as it grows the triceps; the literature on "fractional" set counting
 * offers no agreed coefficient at all, and reasonable programs use 0, 0.5 or
 * 1. Half is picked because it is the common one and because the alternatives
 * are worse in obvious ways: 0 makes an arm-free program look like it never
 * trains biceps, and 1 makes every pulling day claim a full week of biceps
 * volume. **The UI has to say this too** wherever the number is shown — an
 * unlabelled "18 sets" invites comparison against a published guideline that
 * counted sets differently.
 */
export const SECONDARY_MUSCLE_SET_CREDIT = 0.5;

export const ACWR_ACUTE_DAYS = 7;
export const ACWR_CHRONIC_DAYS = 28;

/**
 * Sessions with a computable load required in the 28-day window before ACWR
 * will answer.
 *
 * Two a week for the full four weeks. Below that the chronic mean is set by a
 * handful of days, and one heavy session moves the denominator enough to swing
 * the ratio across a whole "risk zone" on its own — the metric would be
 * reporting sampling noise. The floor doubles as a completeness guard: a
 * session with no `sessionRpe` or no duration has an UNKNOWN load, not a zero
 * one, so it is excluded from both the sums and this count, and a month of
 * half-filled entries falls below the threshold and returns null rather than
 * quietly reading as a month of light training.
 */
export const ACWR_MIN_CHRONIC_SESSIONS = 8;

/**
 * Sessions of one exercise required before a progression slope is reported.
 *
 * Two points are a difference, not a trend, and three give an r² that is
 * indistinguishable from noise: day-to-day strength swings by several kilos on
 * sleep and food alone, which is the same order as a month of real progress.
 * Four sessions of a given lift is two to four weeks of training — the
 * shortest span over which a slope means more than one good day.
 */
export const OVERLOAD_MIN_SESSIONS = 4;

export interface WorkoutSetInput {
  /** Null on a `time` exercise — a plank has no reps. */
  reps: number | null;
  /** External load. Null on `bodyweight_reps`. */
  weightKg: number | null;
  rpe: number | null;
  /** Null on everything but `time`. */
  durationSec: number | null;
  isWarmup: boolean;
}

/** One exercise as it was actually performed, with the catalogue fields the
 *  maths needs flattened onto it. */
export interface PerformedExercise {
  exerciseId: string;
  metric: Metric;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  sets: WorkoutSetInput[];
}

export interface WorkoutSessionInput {
  /** UTC midnight of the day the session STARTED, per `local-date.ts`. */
  localDate: Date;
  /** Foster's 0–10 session RPE. Null when it was not asked for. */
  sessionRpe: number | null;
  durationMin: number | null;
  exercises: PerformedExercise[];
}

/** Warm-ups are not training volume. See the file header. */
export function workingSets(exercise: PerformedExercise): WorkoutSetInput[] {
  return exercise.sets.filter((set) => !set.isWarmup);
}

export interface E1rmEstimate {
  valueKg: number;
  /**
   * True above `E1RM_RELIABLE_MAX_REPS`. Such an estimate is still shown —
   * dropping it would erase a 20-rep back-off set from the progression chart
   * entirely, which reads as "you did not train that day" — but it is barred
   * from setting a personal record and from the progression regression.
   */
  unreliable: boolean;
}

/**
 * Epley: `1RM ≈ w × (1 + reps/30)`.
 *
 * Chosen over Brzycki because Brzycki's denominator (`37 − reps`) blows up as
 * reps approach 37 and goes negative past it, which is a worse failure mode
 * for a field that accepts free-form input than Epley's steady overestimate.
 *
 * Returns null rather than zero for a set that cannot produce an estimate —
 * no load, or no reps. A `bodyweight_reps` set has genuine load that this
 * function cannot see, and calling it 0 kg would be a lie about the training,
 * not a missing value.
 */
export function epleyE1rm(
  weightKg: number | null,
  reps: number | null
): E1rmEstimate | null {
  if (weightKg === null || reps === null) return null;
  if (weightKg <= 0 || reps <= 0) return null;

  return {
    valueKg: weightKg * (1 + reps / 30),
    unreliable: reps > E1RM_RELIABLE_MAX_REPS,
  };
}

/**
 * Best RELIABLE e1RM among an exercise's working sets, or null.
 *
 * Only `weight_reps`. A `weighted_bodyweight` set carries an unknown fraction
 * of body mass in addition to the belt plate, so the recorded kilos are not
 * the load being lifted and an e1RM computed from them is simply wrong.
 */
export function bestE1rmKg(exercise: PerformedExercise): number | null {
  if (exercise.metric !== 'weight_reps') return null;

  let best: number | null = null;

  for (const set of workingSets(exercise)) {
    const estimate = epleyE1rm(set.weightKg, set.reps);
    if (estimate === null || estimate.unreliable) continue;
    if (best === null || estimate.valueKg > best) best = estimate.valueKg;
  }

  return best;
}

/**
 * Volume, split by what the metric actually measures.
 *
 * Deliberately four numbers instead of one total. Summing them would require
 * pretending a 60-second plank and a 100 kg × 5 squat are the same quantity,
 * and the usual way that pretence is implemented — coercing the missing field
 * to zero — silently drops every bodyweight and timed exercise out of the
 * figure the screen calls "volume".
 */
export interface VolumeBreakdown {
  /** Σ(reps × weightKg) over working `weight_reps` sets. Tonnage. */
  loadKg: number;
  /**
   * The same sum over `weighted_bodyweight`, kept APART from `loadKg`: 20 kg
   * hung from a dip belt is a supplement to an unmeasured body mass, not a
   * comparable tonnage, and folding it into the barbell total makes the total
   * mean two different things at once.
   */
  addedLoadKg: number;
  /** Working reps on `bodyweight_reps` and `weighted_bodyweight`, where reps
   *  are the only honest unit of work available. */
  bodyweightReps: number;
  /** Σ(durationSec) over working `time` sets. */
  timeSec: number;
}

export function volumeBreakdown(
  exercises: PerformedExercise[]
): VolumeBreakdown {
  const total: VolumeBreakdown = {
    loadKg: 0,
    addedLoadKg: 0,
    bodyweightReps: 0,
    timeSec: 0,
  };

  for (const exercise of exercises) {
    for (const set of workingSets(exercise)) {
      const reps = set.reps ?? 0;
      const weight = set.weightKg ?? 0;

      switch (exercise.metric) {
        case 'weight_reps':
          total.loadKg += reps * weight;
          break;
        case 'weighted_bodyweight':
          total.addedLoadKg += reps * weight;
          total.bodyweightReps += reps;
          break;
        case 'bodyweight_reps':
          total.bodyweightReps += reps;
          break;
        case 'time':
          total.timeSec += set.durationSec ?? 0;
          break;
      }
    }
  }

  return total;
}

/** Tonnage only — the headline "volume load" figure. */
export function volumeLoadKg(exercises: PerformedExercise[]): number {
  return volumeBreakdown(exercises).loadKg;
}

/**
 * Hard sets per muscle: 1.0 to the primary, `SECONDARY_MUSCLE_SET_CREDIT` to
 * each secondary, over working sets only.
 *
 * Every metric counts. A plank is a working set of core even though it
 * produces no tonnage — the count is a measure of stimulus exposure, not of
 * kilos moved, and those are different questions with different answers.
 *
 * Muscles with no exposure are absent from the record rather than present as
 * zero, so a caller can tell "not trained in this window" apart from
 * "trained", and a UI listing every muscle in `MUSCLES` decides for itself how
 * to render the gaps.
 */
export function hardSetsByMuscle(
  sessions: WorkoutSessionInput[]
): Partial<Record<Muscle, number>> {
  const counts: Partial<Record<Muscle, number>> = {};

  const credit = (muscle: Muscle, amount: number) => {
    counts[muscle] = (counts[muscle] ?? 0) + amount;
  };

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const count = workingSets(exercise).length;
      if (count === 0) continue;

      credit(exercise.primaryMuscle, count);

      for (const muscle of exercise.secondaryMuscles) {
        // A secondary listed twice, or one that repeats the primary, would
        // otherwise double-count. The catalogue does not forbid it.
        if (muscle === exercise.primaryMuscle) continue;
        credit(muscle, count * SECONDARY_MUSCLE_SET_CREDIT);
      }
    }
  }

  return counts;
}

/** Sessions whose `localDate` falls in the trailing window of `days` ending on
 *  `endDate`, inclusive at both ends — the same convention as `sleepDebt` in
 *  `sleep-insights.ts`. */
export function sessionsInWindow(
  sessions: WorkoutSessionInput[],
  endDate: Date,
  days: number
): WorkoutSessionInput[] {
  const from = addDays(endDate, -(days - 1));

  return sessions.filter((s) => s.localDate >= from && s.localDate <= endDate);
}

export function weeklyHardSetsByMuscle(
  sessions: WorkoutSessionInput[],
  endDate: Date,
  days = 7
): Partial<Record<Muscle, number>> {
  return hardSetsByMuscle(sessionsInWindow(sessions, endDate, days));
}

/**
 * Foster's session-RPE training load: `sessionRpe × durationMin`, in
 * arbitrary units.
 *
 * Returns null when either factor is missing. Not zero: an unrecorded RPE
 * means the session's load is unknown, and a zero would make a hard hour of
 * training indistinguishable from a rest day in every sum downstream —
 * including the ACWR denominator, where it would make the ratio look higher
 * than it is exactly when a lifter has been too tired to fill the form in.
 */
export function sessionLoad(session: WorkoutSessionInput): number | null {
  if (session.sessionRpe === null || session.durationMin === null) return null;

  return session.sessionRpe * session.durationMin;
}

/** Sum of the computable loads in the trailing window. Sessions whose load is
 *  unknown are skipped; `known` and `unknown` are reported so a caller can say
 *  the total is partial rather than presenting it as complete. */
export function windowLoad(
  sessions: WorkoutSessionInput[],
  endDate: Date,
  days: number
): { load: number; known: number; unknown: number } {
  let load = 0;
  let known = 0;
  let unknown = 0;

  for (const session of sessionsInWindow(sessions, endDate, days)) {
    const value = sessionLoad(session);
    if (value === null) {
      unknown += 1;
      continue;
    }
    load += value;
    known += 1;
  }

  return { load, known, unknown };
}

export function weeklyLoad(
  sessions: WorkoutSessionInput[],
  endDate: Date,
  days = 7
): { load: number; known: number; unknown: number } {
  return windowLoad(sessions, endDate, days);
}

/**
 * Acute:chronic workload ratio — mean daily load over 7 days ÷ mean over 28.
 *
 * **Ship it with this caveat, and put it on screen too: the ratio has been
 * substantially criticised on statistical grounds.** Impellizzeri et al. show
 * that because the acute window is CONTAINED IN the chronic one, the two are
 * autocorrelated by construction, and that the "sweet spot" reported in the
 * original work is partly an artifact of that coupling plus the mathematical
 * coupling of a ratio to its own denominator. Reported associations with
 * injury do not survive reanalysis with those artifacts controlled.
 *
 * It stays because the underlying idea — a week that is far out of line with
 * the month behind it deserves a second look — is still worth prompting on.
 * **It is a prompt, not a diagnosis**, and nothing in this app may act on it.
 *
 * Rest days are counted as real zeros: a mean over the WINDOW, not over the
 * days that happened to have a session, which is the whole point of the
 * measure. Days with an unknown load are not, hence
 * `ACWR_MIN_CHRONIC_SESSIONS`.
 *
 * Returns null when the chronic window is too sparse to mean anything, or when
 * the chronic mean is zero — no training at all has no ratio, and reporting
 * Infinity or 0 would both be read as findings.
 */
export function acwr(
  sessions: WorkoutSessionInput[],
  endDate: Date
): number | null {
  const acute = windowLoad(sessions, endDate, ACWR_ACUTE_DAYS);
  const chronic = windowLoad(sessions, endDate, ACWR_CHRONIC_DAYS);

  if (chronic.known < ACWR_MIN_CHRONIC_SESSIONS) return null;

  const chronicMean = chronic.load / ACWR_CHRONIC_DAYS;
  if (chronicMean <= 0) return null;

  return acute.load / ACWR_ACUTE_DAYS / chronicMean;
}

export interface HeaviestRecord {
  weightKg: number;
  /** The MOST reps achieved at that weight, across the whole history. */
  reps: number;
  localDate: Date;
}

export interface E1rmRecord {
  valueKg: number;
  weightKg: number;
  reps: number;
  localDate: Date;
}

export interface PersonalRecords {
  heaviest: HeaviestRecord | null;
  bestE1rm: E1rmRecord | null;
}

/**
 * Personal records for one exercise across a history of sessions.
 *
 * Three records in two fields, because "most reps" is only meaningful attached
 * to the weight it was done at: 12 × 60 kg is not a rep record for a lifter
 * whose top set is 140 kg.
 *
 * The heaviest set and the best e1RM are frequently DIFFERENT sets — a heavy
 * single is the heaviest weight, while a set of five slightly below it usually
 * estimates a higher maximum — and reporting only one of them hides half of
 * what progressed.
 *
 * Warm-ups are excluded (a warm-up single is not a record), unreliable
 * estimates cannot set the e1RM record, and only `weight_reps` participates at
 * all. Ties go to the EARLIEST date: the record was set the first time it was
 * hit, and repeating it is not a new one.
 */
export function personalRecords(
  sessions: WorkoutSessionInput[],
  exerciseId: string
): PersonalRecords {
  let heaviest: HeaviestRecord | null = null;
  let bestE1rm: E1rmRecord | null = null;

  const ordered = [...sessions].sort(
    (a, b) => a.localDate.getTime() - b.localDate.getTime()
  );

  for (const session of ordered) {
    for (const exercise of session.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      if (exercise.metric !== 'weight_reps') continue;

      for (const set of workingSets(exercise)) {
        const { weightKg, reps } = set;
        // Destructured and checked here rather than trusting the estimate's
        // non-null return, so the record fields narrow without a cast.
        if (weightKg === null || reps === null) continue;

        const estimate = epleyE1rm(weightKg, reps);
        if (estimate === null) continue;

        if (
          heaviest === null ||
          weightKg > heaviest.weightKg ||
          (weightKg === heaviest.weightKg && reps > heaviest.reps)
        ) {
          heaviest = { weightKg, reps, localDate: session.localDate };
        }

        if (
          !estimate.unreliable &&
          (bestE1rm === null || estimate.valueKg > bestE1rm.valueKg)
        ) {
          bestE1rm = {
            valueKg: estimate.valueKg,
            weightKg,
            reps,
            localDate: session.localDate,
          };
        }
      }
    }
  }

  return { heaviest, bestE1rm };
}

export interface E1rmPoint {
  localDate: Date;
  e1rmKg: number;
}

/**
 * Best reliable e1RM per session for one exercise, oldest first.
 *
 * Sessions where the exercise was not trained, or produced no reliable
 * estimate, are ABSENT rather than zero — the regression must not read a rest
 * week as a collapse in strength. An exercise performed twice in one session
 * (a superset, or a second run at it later) contributes its best set once.
 */
export function e1rmSeries(
  sessions: WorkoutSessionInput[],
  exerciseId: string
): E1rmPoint[] {
  const points: E1rmPoint[] = [];

  for (const session of sessions) {
    let best: number | null = null;

    for (const exercise of session.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      const value = bestE1rmKg(exercise);
      if (value !== null && (best === null || value > best)) best = value;
    }

    if (best !== null)
      points.push({ localDate: session.localDate, e1rmKg: best });
  }

  return points.sort((a, b) => a.localDate.getTime() - b.localDate.getTime());
}

/**
 * Progressive overload: the slope of an ordinary least-squares line through
 * the best e1RM of the last `lastSessions` sessions, in **kg per session**.
 *
 * Per SESSION, not per day, and that is a deliberate choice: a fortnight away
 * from the gym is not fourteen days of negative progress, but a
 * calendar-x-axis regression scores it as exactly that. Sessions are the unit
 * of training, so they are the unit of the trend.
 *
 * Returns null below `OVERLOAD_MIN_SESSIONS`, and null when every point falls
 * on the same session index (a zero-variance x, which has no slope) — the
 * sort makes that unreachable for distinct sessions, but it is guarded rather
 * than divided by.
 */
export function overloadSlopeKgPerSession(
  sessions: WorkoutSessionInput[],
  exerciseId: string,
  lastSessions = 8
): number | null {
  const series = e1rmSeries(sessions, exerciseId).slice(-lastSessions);

  if (series.length < OVERLOAD_MIN_SESSIONS) return null;

  const n = series.length;
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((sum, p) => sum + p.e1rmKg, 0) / n;

  let covariance = 0;
  let variance = 0;

  for (let i = 0; i < n; i += 1) {
    covariance += (i - meanX) * (series[i].e1rmKg - meanY);
    variance += (i - meanX) ** 2;
  }

  if (variance === 0) return null;

  return covariance / variance;
}
