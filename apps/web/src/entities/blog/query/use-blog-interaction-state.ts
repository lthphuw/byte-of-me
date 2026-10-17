'use client';

import type { INTERACTION } from '@byte-of-me/api-core';
import { useQuery } from '@tanstack/react-query';

import { blogQueries } from './blog-queries';

import type { BlogInteractionState } from '@/entities/blog/api/get-blog-interactions-for-user';

/**
 * One like or clap on a post: the count and the reader's own state. `seed` is
 * the server's read, shown first; `enabled` decides whether the query runs.
 */
export function useBlogInteractionState({
  blogId,
  kind,
  seed,
  enabled,
}: {
  blogId: string;
  kind: INTERACTION;
  /** The server's read. Absent when that read failed: the count is then fetched. */
  seed?: BlogInteractionState;
  enabled: boolean;
}) {
  return useQuery({
    ...blogQueries.interaction(blogId, kind),
    initialData: seed,
    enabled,
  });
}
