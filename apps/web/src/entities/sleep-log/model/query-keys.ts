/** The only source of TanStack query keys for sleep logs. Never an inline
 *  literal: a prefetch and the `useQuery` hydrating from it must call the
 *  same function, and a mismatch leaves skeletons on screen without raising. */
export const sleepLogKeys = {
  all: ['sleep-log'] as const,
  /** Prefix-matches every summary window. What a write invalidates: one new
   *  row changes debt and deviation for every window containing it. */
  summaryAll: () => [...sleepLogKeys.all, 'summary'] as const,
  today: () => [...sleepLogKeys.all, 'today'] as const,
};
