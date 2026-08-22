import type { SleepNight } from '@/shared/lib/health/sleep-stats';

/** One stored row, as the client receives it. Dates are ISO strings — a server
 *  action's return value is serialized, so `Date` would arrive as a string
 *  while the type claimed otherwise. */
export interface SleepLogRow {
  id: string;
  localDate: string;
  bedAt: string;
  wakeAt: string;
  latencyMin: number | null;
  awakeningsMin: number | null;
  quality: number | null;
  note: string | null;
  isFreeDay: boolean;
  factors: string[];
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
}
