/**
 * The only source of TanStack query keys for workout sessions. Never write an
 * inline key literal: a server prefetch and the `useQuery` that hydrates from
 * it must call the same function with the same arguments, and a mismatch does
 * not raise — it silently falls through to a client fetch and leaves
 * skeletons on screen (AGENTS §6).
 */
export const workoutKeys = {
  all: ['workout'] as const,

  /** The session still running, if any. Every set, exercise and finish write
   *  invalidates this one key — they all change what the open session
   *  contains. */
  open: () => [...workoutKeys.all, 'open'] as const,

  detail: (id: string) => [...workoutKeys.all, 'detail', id] as const,

  /** Prefix-matches every history window. What finishing or deleting a
   *  session invalidates: the row can enter or leave any window that contains
   *  its day, and enumerating those is not worth it. */
  ranges: () => [...workoutKeys.all, 'range'] as const,
  /** `from`/`to` are `YYYY-MM-DD`, inclusive at both ends. */
  range: (from: string, to: string) =>
    [...workoutKeys.ranges(), from, to] as const,
};
