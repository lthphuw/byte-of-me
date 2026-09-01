import type { SleepNight } from '@/shared/lib/health/sleep-stats';

/** One stored row, as the client receives it. Dates are ISO strings — a server
 *  action's return value is serialized, so `Date` would arrive as a string
 *  while the type claimed otherwise. */
export interface SleepLogRow {
  id: string;
  localDate: string;
  bedAt: string;
  wakeAt: string;
  /** Null on every row written before the column existed. */
  riseAt: string | null;
  latencyMin: number | null;
  awakeningsMin: number | null;
  awakeningsCount: number | null;
  quality: number | null;
  restedness: number | null;
  /** One of `NAP_BUCKETS`, or null when unanswered. */
  napBucket: string | null;
  note: string | null;
  isFreeDay: boolean;
  factors: string[];
  /** When the entry was first written — stamped by the server, never moved by
   *  a later correction. Null on rows that predate the column. */
  loggedAt: string | null;
}

/** Everything the sleep screen and the hub read. Computed server-side so the
 *  statistics module never has to reach the browser. */
export interface SleepSummary {
  nights: Array<Omit<SleepNight, 'localDate'> & { localDate: string }>;
  /** Rolling 14-day shortfall against `targetMin`, floored at zero. */
  debtMin: number;
  /** Population SD of bedtime / waketime, in minutes. Null below two nights. */
  bedtimeSdMin: number | null;
  waketimeSdMin: number | null;
  streak: number;
  /** The owner's nightly goal, from workspace settings. */
  targetMin: number;

  /**
   * Sleep Regularity Index, -100..100. Null when no two consecutive calendar
   * days are fully determined — which needs four nights, not two.
   */
  sri: number | null;
  /** |MSF - MSW| in minutes. Null below three free AND three work days. */
  socialJetlagMin: number | null;
  /** Chronotype proxy: minutes past midnight. Null without both kinds of day. */
  msfscMin: number | null;
  /**
   * So the screen can say "not enough free days yet" rather than "no data".
   * A null metric has two very different causes and they need different copy.
   */
  freeDayCount: number;
  workDayCount: number;
}
