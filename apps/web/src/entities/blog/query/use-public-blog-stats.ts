'use client';

import { useQuery } from '@tanstack/react-query';

import { blogQueries } from './blog-queries';

/** Live view and reading-time counts for one post, read in the browser. */
export function usePublicBlogStats(blogId: string) {
  return useQuery(blogQueries.stats(blogId));
}
