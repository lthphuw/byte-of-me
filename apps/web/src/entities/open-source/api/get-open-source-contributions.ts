'use server';

import { logger } from '@byte-of-me/logger';

import { fetchMergedPullRequests } from '@/entities/open-source/lib/fetch-merged-pull-requests';
import { groupByRepo } from '@/entities/open-source/lib/group-by-repo';
import type { OpenSourceRepo } from '@/entities/open-source/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { env } from '@/shared/config/env';
import { CACHE_TAGS } from '@/shared/lib/constants';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const REVALIDATE_SECONDS = 3600;

/**
 * Merged pull requests to other people's repos, one entry per repo.
 *
 * The data lives on GitHub, not in our database, so nothing in the app can
 * invalidate it: the cache entry refreshes by time. A failed refresh throws
 * out of the cached function, which leaves the previous entry in place and
 * makes the page hide the section only when there has never been a good read.
 */
export async function getOpenSourceContributions(): Promise<
  ApiResponse<{ repos: OpenSourceRepo[] }>
> {
  return handlePublicAction('getOpenSourceContributions', async () => {
    return await withPublicActionHandler(
      'getOpenSourceContributions',
      async () => {
        if (!env.GITHUB_TOKEN) {
          logger.warn(
            '[Public] getOpenSourceContributions: GITHUB_TOKEN is not set; the open-source section is hidden'
          );
          return { repos: [] };
        }

        const nodes = await fetchMergedPullRequests(
          env.GITHUB_LOGIN,
          env.GITHUB_TOKEN
        );

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
