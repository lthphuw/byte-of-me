import type { SleepLogRow } from './types';

import { localDateKey } from '@/shared/lib/health/local-date';

/** The columns every read of a night selects. Inline in two actions is how
 *  `riseAt` reaches one screen and not the other. A plain literal, so a
 *  `'use server'` file can import it — those export only async functions. */
export const SLEEP_LOG_SELECT = {
  id: true,
  localDate: true,
  bedAt: true,
  wakeAt: true,
  riseAt: true,
  latencyMin: true,
  awakeningsMin: true,
  awakeningsCount: true,
  quality: true,
  restedness: true,
  napBucket: true,
  note: true,
  isFreeDay: true,
  factors: true,
  loggedAt: true,
} as const;

/** One stored night, structurally — deliberately not the Prisma type, so this
 *  module stays free of a server-only import. */
export interface StoredSleepLog {
  id: string;
  localDate: Date;
  bedAt: Date;
  wakeAt: Date;
  riseAt: Date | null;
  latencyMin: number | null;
  awakeningsMin: number | null;
  awakeningsCount: number | null;
  quality: number | null;
  restedness: number | null;
  napBucket: string | null;
  note: string | null;
  isFreeDay: boolean;
  factors: string[];
  loggedAt: Date | null;
}

/** A stored night as the client receives it: every `Date` becomes an ISO
 *  string, since the return value is serialized either way. `localDate` is
 *  the exception — a calendar day, through `localDateKey`. */
export function toSleepLogRow(row: StoredSleepLog): SleepLogRow {
  return {
    ...row,
    localDate: localDateKey(row.localDate),
    bedAt: row.bedAt.toISOString(),
    wakeAt: row.wakeAt.toISOString(),
    riseAt: row.riseAt?.toISOString() ?? null,
    loggedAt: row.loggedAt?.toISOString() ?? null,
  };
}
