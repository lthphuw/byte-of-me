/**
 * The only source of TanStack query keys for sleep logs. Never write an inline
 * key literal: a server prefetch and the `useQuery` that hydrates from it must
 * call the same function with the same arguments, and a mismatch does not
 * raise — it silently falls through to a client fetch and leaves skeletons on
 * screen.
 */
export const sleepLogKeys = {
  all: ['sleep-log'] as const,
  /** One window of days. `from`/`to` are `YYYY-MM-DD`. */
  range: (from: string, to: string) =>
    [...sleepLogKeys.all, 'range', from, to] as const,
  /** The computed summary for a rolling window. */
  summary: (days: number) => [...sleepLogKeys.all, 'summary', days] as const,
  /** Prefix-matches every summary window. What a write invalidates: the new
   *  row changes debt, streak and deviation for every window that contains it,
   *  and enumerating those windows is not worth it. */
  summaryAll: () => [...sleepLogKeys.all, 'summary'] as const,
  today: () => [...sleepLogKeys.all, 'today'] as const,
};
