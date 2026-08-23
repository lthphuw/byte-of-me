/**
 * The only source of TanStack query keys for health insights. Never write an
 * inline key literal: a server prefetch and the `useQuery` that hydrates from
 * it must call the same function with the same arguments, and a mismatch does
 * not raise — it silently falls through to a client fetch and leaves
 * skeletons on screen (AGENTS §6).
 */
export const healthInsightKeys = {
  all: ['health-insight'] as const,

  /** The sleep-versus-training correlation over a rolling window of `days`.
   *  Keyed on the window because the coefficients change completely with it. */
  sleepTraining: (days: number) =>
    [...healthInsightKeys.all, 'sleep-training', days] as const,
};
