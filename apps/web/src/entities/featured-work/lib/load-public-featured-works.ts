import { prisma } from '@byte-of-me/db';

import {
  defaultFeaturedWorkGithubDeps,
  type FeaturedWorkGithubDeps,
  getFeaturedWorkGithub,
} from '@/entities/featured-work/lib/get-featured-work-github';
import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const MAX_WORKS = 6;

type FeaturedWorkRow = Pick<
  PublicFeaturedWork,
  'id' | 'title' | 'description' | 'url' | 'host'
>;

/**
 * The database is not trusted to hold a safe url: anything that is not http(s)
 * (`javascript:`, `data:`, garbage) becomes a non-link row with no host.
 */
function safeLink(
  raw: string | null
): { url: string; host: string | null } | { url: null; host: null } {
  if (!raw) return { url: null, host: null };
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: null, host: null };
    }
    return { url: raw, host: parsed.hostname.replace(/^www\./, '') || null };
  } catch {
    return { url: null, host: null };
  }
}

/** A work with no usable translation is skipped: one bad row must not blank the section. */
export function toRows(
  works: Array<{
    id: string;
    url: string | null;
    translations: Array<{
      language: string;
      title: string;
      description: string | null;
    }>;
  }>,
  locale: string
): FeaturedWorkRow[] {
  return works.flatMap((work) => {
    const translation = getTranslatedContent(work.translations, locale);
    if (!translation?.title) return [];
    return [
      {
        id: work.id,
        title: translation.title,
        description: translation.description,
        ...safeLink(work.url),
      },
    ];
  });
}

async function getPublicFeaturedWorkRows(): Promise<
  ApiResponse<{ rows: FeaturedWorkRow[] }>
> {
  return handlePublicAction('getPublicFeaturedWorkRows', async () => {
    return await withPublicActionHandler(
      'getPublicFeaturedWorkRows',
      async ({ locale, userId }) => {
        const works = await prisma.featuredWork.findMany({
          where: { userId, isPublished: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          take: MAX_WORKS,
          select: {
            id: true,
            url: true,
            translations: {
              where: { language: { in: getTranslationLanguages(locale) } },
              orderBy: { language: 'asc' },
              select: { language: true, title: true, description: true },
            },
          },
        });

        return { rows: toRows(works, locale) };
      },
      {
        cache: true,
        cacheKey: ['featured-works-rows'],
        cacheTags: [CACHE_TAGS.FEATURED_WORK],
      }
    );
  });
}

/**
 * Rows from the database, then the GitHub facts for the ones that link a pull
 * request. The GitHub half never fails the section: it degrades to no `github`.
 */
export async function loadPublicFeaturedWorks(
  deps: FeaturedWorkGithubDeps = defaultFeaturedWorkGithubDeps
): Promise<ApiResponse<{ works: PublicFeaturedWork[] }>> {
  const rowsResp = await getPublicFeaturedWorkRows();
  if (!rowsResp.success) return rowsResp;

  const { rows } = rowsResp.data;
  const github = await getFeaturedWorkGithub(
    rows.flatMap((row) => (row.url ? [row.url] : [])),
    deps
  );

  return {
    success: true,
    data: {
      works: rows.map((row) => ({
        ...row,
        github: row.url ? (github[row.url] ?? null) : null,
      })),
    },
  };
}
