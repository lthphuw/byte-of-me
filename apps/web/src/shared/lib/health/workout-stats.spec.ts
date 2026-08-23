/**
 * What this spec defends: warm-up sets never reach a hypertrophy figure, an
 * estimate outside the range its formula is valid on cannot become a personal
 * record, metrics that measure different things are never summed into one
 * "volume", and every measure that needs a history refuses to answer without
 * one.
 *
 * Every expected value states its arithmetic, so a reader can check the
 * numbers without running the code.
 */
import { describe, expect, it } from 'bun:test';

import {
  acwr,
  bestE1rmKg,
  e1rmSeries,
  epleyE1rm,
  hardSetsByMuscle,
  overloadSlopeKgPerSession,
  type PerformedExercise,
  personalRecords,
  sessionLoad,
  volumeBreakdown,
  volumeLoadKg,
  weeklyHardSetsByMuscle,
  weeklyLoad,
  type WorkoutSessionInput,
  type WorkoutSetInput,
} from './workout-stats';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const set = (over: Partial<WorkoutSetInput> = {}): WorkoutSetInput => ({
  reps: null,
  weightKg: null,
  rpe: null,
  durationSec: null,
  isWarmup: false,
  ...over,
});

/** A working `weight_reps` set. */
const work = (weightKg: number, reps: number) => set({ weightKg, reps });
const warmup = (weightKg: number, reps: number) =>
  set({ weightKg, reps, isWarmup: true });

const bench = (over: Partial<PerformedExercise> = {}): PerformedExercise => ({
  exerciseId: 'bench',
  metric: 'weight_reps',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'front_delts'],
  sets: [],
  ...over,
});

const session = (
  over: Partial<WorkoutSessionInput> = {}
): WorkoutSessionInput => ({
  localDate: day('2026-08-22'),
  sessionRpe: null,
  durationMin: null,
  exercises: [],
  ...over,
});

describe('epleyE1rm', () => {
  it('applies w × (1 + reps/30)', () => {
    // 100 × (1 + 5/30) = 100 × 7/6 = 116.6667
    expect(epleyE1rm(100, 5)?.valueKg).toBeCloseTo(116.6667, 4);
    expect(epleyE1rm(100, 5)?.unreliable).toBe(false);
  });

  it('flags an estimate above twelve reps rather than hiding it', () => {
    // 60 × (1 + 20/30) = 60 × 5/3 = 100 — plausible-looking and out of range.
    const estimate = epleyE1rm(60, 20);
    expect(estimate?.valueKg).toBeCloseTo(100, 6);
    expect(estimate?.unreliable).toBe(true);
  });

  it('treats twelve as the last reliable rep', () => {
    expect(epleyE1rm(100, 12)?.unreliable).toBe(false);
    expect(epleyE1rm(100, 13)?.unreliable).toBe(true);
  });

  it('returns null rather than zero when there is no external load', () => {
    // A pull-up set: real training, but not an input this formula accepts.
    expect(epleyE1rm(null, 10)).toBeNull();
    expect(epleyE1rm(80, null)).toBeNull();
    expect(epleyE1rm(0, 5)).toBeNull();
  });
});

describe('bestE1rmKg', () => {
  it('ignores warm-up sets even when they are heavier', () => {
    // warm-up 100×5 = 116.6667 is excluded; working 90×5 = 90 × 7/6 = 105.
    expect(
      bestE1rmKg(bench({ sets: [warmup(100, 5), work(90, 5)] }))
    ).toBeCloseTo(105, 6);
  });

  it('never lets a set above twelve reps win', () => {
    // 100×20 = 166.6667 but unreliable; 100×5 = 116.6667 stands.
    expect(
      bestE1rmKg(bench({ sets: [work(100, 20), work(100, 5)] }))
    ).toBeCloseTo(116.6667, 4);
  });

  it('refuses to estimate a maximum for a metric that has no external load', () => {
    const pullUp = bench({
      metric: 'bodyweight_reps',
      sets: [set({ reps: 10 })],
    });
    expect(bestE1rmKg(pullUp)).toBeNull();
  });
});

describe('volume', () => {
  it('excludes warm-up sets from the volume load', () => {
    // working 100×5 + 100×5 = 1000. The 60×10 = 600 warm-up is not training.
    const exercise = bench({
      sets: [warmup(60, 10), work(100, 5), work(100, 5)],
    });
    expect(volumeLoadKg([exercise])).toBe(1000);
  });

  it('gives a timed exercise no volume load at all', () => {
    const plank = bench({
      exerciseId: 'plank',
      metric: 'time',
      primaryMuscle: 'core',
      secondaryMuscles: [],
      sets: [set({ durationSec: 60 }), set({ durationSec: 45 })],
    });

    const totals = volumeBreakdown([plank]);
    expect(totals.loadKg).toBe(0);
    expect(totals.timeSec).toBe(105); // 60 + 45
    expect(totals.bodyweightReps).toBe(0);
  });

  it('counts bodyweight reps as reps, not as zero kilos of tonnage', () => {
    const pullUp = bench({
      metric: 'bodyweight_reps',
      sets: [set({ reps: 10 }), set({ reps: 8 }), set({ reps: 6 })],
    });

    const totals = volumeBreakdown([pullUp]);
    expect(totals.bodyweightReps).toBe(24); // 10 + 8 + 6
    expect(totals.loadKg).toBe(0);
  });

  it('keeps belt-loaded work out of the barbell tonnage', () => {
    const weightedDip = bench({
      metric: 'weighted_bodyweight',
      sets: [set({ reps: 8, weightKg: 20 })],
    });
    const press = bench({ sets: [work(100, 5)] });

    const totals = volumeBreakdown([weightedDip, press]);
    expect(totals.loadKg).toBe(500); // 100 × 5, the barbell only
    expect(totals.addedLoadKg).toBe(160); // 20 × 8, kept separate
    expect(totals.bodyweightReps).toBe(8);
  });
});

describe('hardSetsByMuscle', () => {
  it('counts the primary at 1.0 and each secondary at 0.5', () => {
    const counts = hardSetsByMuscle([
      session({
        exercises: [
          bench({ sets: [warmup(60, 10), work(100, 5), work(100, 5)] }),
        ],
      }),
    ]);

    expect(counts.chest).toBe(2); // two working sets, warm-up excluded
    expect(counts.triceps).toBe(1); // 2 × 0.5
    expect(counts.front_delts).toBe(1); // 2 × 0.5
  });

  it('gives an exercise made only of warm-ups no credit anywhere', () => {
    const counts = hardSetsByMuscle([
      session({
        exercises: [bench({ sets: [warmup(60, 10), warmup(80, 5)] })],
      }),
    ]);

    expect(counts.chest).toBeUndefined();
    expect(counts.triceps).toBeUndefined();
  });

  it('counts a timed working set — stimulus is not measured in kilos', () => {
    const counts = hardSetsByMuscle([
      session({
        exercises: [
          bench({
            metric: 'time',
            primaryMuscle: 'core',
            secondaryMuscles: [],
            sets: [set({ durationSec: 60 }), set({ durationSec: 60 })],
          }),
        ],
      }),
    ]);

    expect(counts.core).toBe(2);
  });

  it('does not pay a muscle twice for being listed as its own secondary', () => {
    const counts = hardSetsByMuscle([
      session({
        exercises: [
          bench({
            secondaryMuscles: ['chest', 'triceps'],
            sets: [work(100, 5)],
          }),
        ],
      }),
    ]);

    expect(counts.chest).toBe(1); // primary only, not 1 + 0.5
    expect(counts.triceps).toBe(0.5);
  });

  it('sums across sessions and windows to the trailing seven days', () => {
    const sessions = [
      session({
        localDate: day('2026-08-10'),
        exercises: [bench({ sets: [work(100, 5)] })],
      }),
      session({
        localDate: day('2026-08-20'),
        exercises: [bench({ sets: [work(100, 5)] })],
      }),
      session({
        localDate: day('2026-08-22'),
        exercises: [bench({ sets: [work(100, 5)] })],
      }),
    ];

    // Window 2026-08-16 .. 2026-08-22 inclusive keeps the last two.
    expect(weeklyHardSetsByMuscle(sessions, day('2026-08-22')).chest).toBe(2);
    expect(hardSetsByMuscle(sessions).chest).toBe(3);
  });
});

describe('session-RPE training load', () => {
  it('multiplies session RPE by duration in minutes', () => {
    expect(sessionLoad(session({ sessionRpe: 8, durationMin: 60 }))).toBe(480);
  });

  it('withholds the load when either factor was not recorded', () => {
    expect(
      sessionLoad(session({ sessionRpe: 8, durationMin: null }))
    ).toBeNull();
    expect(
      sessionLoad(session({ sessionRpe: null, durationMin: 60 }))
    ).toBeNull();
  });

  it('sums the week and reports how much of it is unknown', () => {
    const sessions = [
      session({ localDate: day('2026-08-20'), sessionRpe: 8, durationMin: 60 }), // 480
      session({ localDate: day('2026-08-21'), sessionRpe: 6, durationMin: 45 }), // 270
      session({
        localDate: day('2026-08-22'),
        sessionRpe: null,
        durationMin: 45,
      }),
      session({ localDate: day('2026-08-01'), sessionRpe: 9, durationMin: 90 }), // out
    ];

    const week = weeklyLoad(sessions, day('2026-08-22'));
    expect(week.load).toBe(750); // 480 + 270
    expect(week.known).toBe(2);
    expect(week.unknown).toBe(1);
  });
});

describe('acwr', () => {
  const end = day('2026-08-28');

  /** Sessions of load 500 (RPE 5 × 100 min) on twelve alternate days from the
   *  2nd to the 24th — all inside the 28-day window 08-01 .. 08-28. */
  const everyOtherDay = (
    count: number,
    over: Partial<WorkoutSessionInput> = {}
  ) =>
    Array.from({ length: count }, (_, i) =>
      session({
        localDate: day(`2026-08-${String(2 + i * 2).padStart(2, '0')}`),
        sessionRpe: 5,
        durationMin: 100,
        ...over,
      })
    );

  it('divides the mean daily acute load by the mean daily chronic load', () => {
    // 12 sessions × 500 = 6000 over 28 days -> chronic mean 214.2857/day.
    // The acute window 08-22..08-28 catches the 22nd and 24th: 1000 over
    // 7 days -> 142.857/day.  142.857 / 214.2857 = 2/3.
    expect(acwr(everyOtherDay(12), end)).toBeCloseTo(2 / 3, 6);
  });

  it('refuses to answer on a window too sparse to mean anything', () => {
    // Seven sessions is below the eight-session floor: one heavy day would
    // move the denominator enough to swing the ratio on its own.
    expect(acwr(everyOtherDay(7), end)).toBeNull();
  });

  it('treats an unrecorded RPE as unknown, not as a light day', () => {
    // Twelve sessions, but only five carry an RPE — the other seven have an
    // unknown load, so the count of usable sessions is 5 and it returns null
    // rather than reporting a month that looks suspiciously easy.
    const sessions = [
      ...everyOtherDay(5),
      ...everyOtherDay(7).map((s, i) =>
        session({
          localDate: day(`2026-08-${String(12 + i * 2).padStart(2, '0')}`),
          sessionRpe: null,
          durationMin: 100,
        })
      ),
    ];

    expect(acwr(sessions, end)).toBeNull();
  });

  it('returns null rather than a ratio when the chronic load is zero', () => {
    expect(acwr(everyOtherDay(12, { durationMin: 0 }), end)).toBeNull();
  });
});

describe('personalRecords', () => {
  /**
   * A history where the heaviest weight and the best e1RM are different sets
   * in different sessions:
   *   08-01  110 × 5  ->  110 × 7/6   = 128.3333  <- best e1RM
   *   08-08  120 × 1  ->  120 × 31/30 = 124
   *   08-15  120 × 2  ->  120 × 16/15 = 128       <- heaviest, most reps at it
   * The 130 × 1 on 08-08 is a warm-up and must be invisible to all three.
   */
  const history = [
    session({
      localDate: day('2026-08-01'),
      exercises: [bench({ sets: [work(110, 5)] })],
    }),
    session({
      localDate: day('2026-08-08'),
      exercises: [bench({ sets: [warmup(130, 1), work(120, 1)] })],
    }),
    session({
      localDate: day('2026-08-15'),
      exercises: [bench({ sets: [work(120, 2)] })],
    }),
  ];

  it('reports the heaviest weight and the most reps achieved at it', () => {
    const { heaviest } = personalRecords(history, 'bench');
    expect(heaviest?.weightKg).toBe(120);
    expect(heaviest?.reps).toBe(2);
    expect(heaviest?.localDate).toEqual(day('2026-08-15'));
  });

  it('reports a best e1RM from a different, lighter set', () => {
    const { bestE1rm } = personalRecords(history, 'bench');
    expect(bestE1rm?.valueKg).toBeCloseTo(128.3333, 4); // 110 × 7/6
    expect(bestE1rm?.weightKg).toBe(110);
    expect(bestE1rm?.reps).toBe(5);
    expect(bestE1rm?.localDate).toEqual(day('2026-08-01'));
  });

  it('never lets a warm-up set a record', () => {
    // The 130 × 1 warm-up is heavier than every working set in the history.
    expect(personalRecords(history, 'bench').heaviest?.weightKg).not.toBe(130);
  });

  it('never lets a set above twelve reps set the e1RM record', () => {
    // 100 × 20 estimates 166.6667 — higher than the 128.3333 that stands, and
    // out of the range Epley is valid on.
    const withHighRepSet = [
      ...history,
      session({
        localDate: day('2026-08-22'),
        exercises: [bench({ sets: [work(100, 20)] })],
      }),
    ];

    expect(
      personalRecords(withHighRepSet, 'bench').bestE1rm?.valueKg
    ).toBeCloseTo(128.3333, 4);
  });

  it('dates a tied record to the first time it was hit', () => {
    const repeated = [
      session({
        localDate: day('2026-08-01'),
        exercises: [bench({ sets: [work(100, 5)] })],
      }),
      session({
        localDate: day('2026-08-08'),
        exercises: [bench({ sets: [work(100, 5)] })],
      }),
    ];

    expect(personalRecords(repeated, 'bench').heaviest?.localDate).toEqual(
      day('2026-08-01')
    );
  });

  it('ignores every other exercise in the same session', () => {
    const mixed = [
      session({
        localDate: day('2026-08-01'),
        exercises: [
          bench({ exerciseId: 'squat', sets: [work(200, 5)] }),
          bench({ sets: [work(100, 5)] }),
        ],
      }),
    ];

    expect(personalRecords(mixed, 'bench').heaviest?.weightKg).toBe(100);
  });

  it('returns nulls for an exercise with nothing but warm-ups logged', () => {
    const onlyWarmups = [
      session({
        localDate: day('2026-08-01'),
        exercises: [bench({ sets: [warmup(60, 10)] })],
      }),
    ];

    expect(personalRecords(onlyWarmups, 'bench')).toEqual({
      heaviest: null,
      bestE1rm: null,
    });
  });
});

describe('progressive overload', () => {
  /** Five reps at each weight, so e1RM is weight × 7/6:
   *  60 -> 70, 66 -> 77, 72 -> 84, 78 -> 91. A clean +7 kg per session. */
  const rising = [60, 66, 72, 78].map((weightKg, i) =>
    session({
      localDate: day(`2026-08-0${i + 1}`),
      exercises: [bench({ sets: [work(weightKg, 5)] })],
    })
  );

  it('builds one point per session, oldest first', () => {
    const series = e1rmSeries(rising, 'bench');
    expect(series.map((p) => p.e1rmKg)).toEqual([70, 77, 84, 91]);
  });

  it('regresses e1RM on session index', () => {
    expect(overloadSlopeKgPerSession(rising, 'bench')).toBeCloseTo(7, 6);
  });

  it('refuses a trend below four sessions', () => {
    expect(overloadSlopeKgPerSession(rising.slice(0, 3), 'bench')).toBeNull();
  });

  it('reports zero for a plateau rather than refusing', () => {
    const flat = [0, 1, 2, 3].map((i) =>
      session({
        localDate: day(`2026-08-0${i + 1}`),
        exercises: [bench({ sets: [work(100, 5)] })],
      })
    );

    expect(overloadSlopeKgPerSession(flat, 'bench')).toBe(0);
  });

  it('skips sessions where the exercise was not trained, rather than scoring them as zero', () => {
    // A squat-only day between two bench days must not read as a collapse.
    const withRestDay = [
      rising[0],
      rising[1],
      session({
        localDate: day('2026-08-03'),
        exercises: [bench({ exerciseId: 'squat', sets: [work(200, 5)] })],
      }),
      rising[2],
      rising[3],
    ];

    expect(e1rmSeries(withRestDay, 'bench')).toHaveLength(4);
    expect(overloadSlopeKgPerSession(withRestDay, 'bench')).toBeCloseTo(7, 6);
  });

  it('only regresses the last N sessions', () => {
    // Two collapsing sessions first, then the same +7 progression. Over all
    // six the slope is dragged down; over the last four it is exactly 7.
    const withHistory = [
      session({
        localDate: day('2026-07-20'),
        exercises: [bench({ sets: [work(120, 5)] })], // 140
      }),
      session({
        localDate: day('2026-07-21'),
        exercises: [bench({ sets: [work(90, 5)] })], // 105
      }),
      ...rising,
    ];

    expect(overloadSlopeKgPerSession(withHistory, 'bench', 4)).toBeCloseTo(
      7,
      6
    );
    expect(
      overloadSlopeKgPerSession(withHistory, 'bench', 6) as number
    ).toBeLessThan(7);
  });
});
