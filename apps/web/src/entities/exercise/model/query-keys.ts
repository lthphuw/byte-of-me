/**
 * The only source of TanStack query keys for the exercise catalog and
 * routines. Never write an inline key literal: a server prefetch and the
 * `useQuery` that hydrates from it must call the same function with the same
 * arguments, and a mismatch does not raise — it silently falls through to a
 * client fetch and leaves skeletons on screen (AGENTS §6).
 */
export const exerciseKeys = {
  all: ['exercise'] as const,

  /** Prefix-matches every catalog list, whatever its filters. What a create,
   *  update or archive invalidates: the new row can enter or leave any of
   *  them, and enumerating the live filter combinations is not worth it. */
  lists: () => [...exerciseKeys.all, 'list'] as const,
  /** One filtered catalog read. The three arguments are exactly
   *  `exerciseListSchema`'s fields, in its order. */
  list: (search: string, muscle: string, includeArchived: boolean) =>
    [...exerciseKeys.lists(), search, muscle, includeArchived] as const,

  /** Prefix-matches every routine list. */
  routines: () => [...exerciseKeys.all, 'routine'] as const,
  routineList: (includeArchived: boolean) =>
    [...exerciseKeys.routines(), 'list', includeArchived] as const,
  routineDetail: (id: string) =>
    [...exerciseKeys.routines(), 'detail', id] as const,
};
