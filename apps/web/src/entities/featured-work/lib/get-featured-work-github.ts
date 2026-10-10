import { logger } from '@byte-of-me/logger';

import { fetchFeaturedWorkGithub } from '@/entities/featured-work/lib/fetch-featured-work-github';
import { parseGithubPullRequestUrl } from '@/entities/featured-work/lib/parse-github-pull-request-url';
import type {
  FeaturedWorkGithub,
  GithubPullRequestRef,
} from '@/entities/featured-work/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { env } from '@/shared/config/env';
import { CACHE_TAGS } from '@/shared/lib/constants';

const REVALIDATE_SECONDS = 3600;

/** What the GitHub half needs from outside; tests swap both, production uses the defaults. */
export interface FeaturedWorkGithubDeps {
  getToken: () => string | undefined;
  fetchGithub: typeof fetchFeaturedWorkGithub;
}

export const defaultFeaturedWorkGithubDeps: FeaturedWorkGithubDeps = {
  getToken: () => env.GITHUB_TOKEN,
  fetchGithub: fetchFeaturedWorkGithub,
};

/**
 * GitHub facts keyed by url, for the urls that are pull requests. The data lives
 * on GitHub, so the cache refreshes by time; every failure degrades to `{}` and
 * the row simply renders without its repo line.
 */
export async function getFeaturedWorkGithub(
  urls: string[],
  deps: FeaturedWorkGithubDeps = defaultFeaturedWorkGithubDeps
): Promise<Record<string, FeaturedWorkGithub>> {
  const entries = [...new Set(urls)].sort().flatMap((url) => {
    const ref = parseGithubPullRequestUrl(url);
    return ref ? [{ url, ref }] : [];
  });
  if (entries.length === 0) return {};

  const token = deps.getToken();

  // Checked before the cache, not inside it: an empty answer caused by a
  // missing token would otherwise be stored for the whole revalidate window.
  if (!token) {
    logger.warn(
      '[Public] getFeaturedWorkGithub: GITHUB_TOKEN is not set; featured works render without GitHub details'
    );
    return {};
  }

  const refs: GithubPullRequestRef[] = entries.map((entry) => entry.ref);

  const resp = await handlePublicAction('getFeaturedWorkGithub', async () => {
    return await withPublicActionHandler(
      'getFeaturedWorkGithub',
      async () => {
        const facts = await deps.fetchGithub(refs, token);
        const byUrl: Record<string, FeaturedWorkGithub> = {};
        entries.forEach((entry, i) => {
          const fact = facts[i];
          if (fact) byUrl[entry.url] = fact;
        });
        return byUrl;
      },
      {
        cache: true,
        cacheKey: ['featured-works-github', ...entries.map((entry) => entry.url)],
        cacheTags: [CACHE_TAGS.FEATURED_WORK],
        revalidate: REVALIDATE_SECONDS,
      }
    );
  });

  if (!resp.success) {
    logger.warn(
      '[Public] getFeaturedWorkGithub: GitHub lookup failed; featured works render without GitHub details'
    );
    return {};
  }
  return resp.data;
}
