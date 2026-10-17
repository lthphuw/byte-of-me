'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import {
  fetchMergedPullRequests,
  groupByRepo,
  type OpenSourceRepo,
} from '@byte-of-me/github';
import { logger } from '@byte-of-me/logger';

import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { env } from '@/shared/config/env';

const REVALIDATE_SECONDS = 3600;

/**
 * Merged PRs to other people's repos, one entry per repo. The data lives on GitHub, so the cache
 * refreshes by time only; a failed refresh throws and keeps the previous entry, so the error state
 * shows only without a prior good read. A missing token is not cached (below).
 */
export async function getOpenSourceContributions(): Promise<
  ApiResponse<{ repos: OpenSourceRepo[] }>
> {
  const token = env.GITHUB_TOKEN;

  // Checked before the cache, not inside it: an empty answer caused by a
  // missing token would otherwise be stored for the whole revalidate window,
  // and adding the token would change nothing until it expired.
  if (!token) {
    logger.warn(
      '[Public] getOpenSourceContributions: GITHUB_TOKEN is not set; the open-source section is hidden'
    );
    return { success: true, data: { repos: [] } };
  }

  return handlePublicAction('getOpenSourceContributions', async () => {
    return await withPublicActionHandler(
      'getOpenSourceContributions',
      async () => {
        const nodes = await fetchMergedPullRequests(env.GITHUB_LOGIN, token);

        return { repos: groupByRepo(nodes) };
      },
      {
        cache: true,
        cacheKey: [CACHE_TAGS.OPEN_SOURCE],
        cacheTags: [CACHE_TAGS.OPEN_SOURCE],
        revalidate: REVALIDATE_SECONDS,
      }
    );
  });
}
