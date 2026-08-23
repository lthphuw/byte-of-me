/**
 * The only source of TanStack query keys for day entries. Never write an
 * inline key literal: a server prefetch and the `useQuery` that hydrates from
 * it must call the same function with the same arguments, and a mismatch does
 * not raise — it silently falls through to a client fetch and leaves
 * skeletons on screen.
 */
export const dayEntryKeys = {
  all: ['day-entry'] as const,
  range: (from: string, to: string) =>
    [...dayEntryKeys.all, 'range', from, to] as const,
  day: (localDate: string) => [...dayEntryKeys.all, 'day', localDate] as const,
};
