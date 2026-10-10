import { prisma } from '@byte-of-me/db';
import {
  isRichTextBlank,
  parseRichTextContent,
} from '@byte-of-me/ui/lib/rich-text-content';
import { renderRichTextDocumentHtml } from '@byte-of-me/ui/rich-text-render';

import {
  defaultFeaturedWorkGithubDeps,
  type FeaturedWorkGithubDeps,
  getFeaturedWorkGithub,
} from '@/entities/featured-work/lib/get-featured-work-github';
import { safeLink } from '@/entities/featured-work/lib/safe-link';
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
  'id' | 'title' | 'description' | 'detailsHtml' | 'url' | 'host'
>;

/**
 * Sanitized HTML of one row's details, or null. Runs inside the cached handler,
 * so a cache hit skips TipTap and the sanitizer. Only a `doc` that renders is a
 * body: anything else shows no toggle, and the stored JSON is never printed.
 */
function toDetailsHtml(details: string | null): string | null {
  if (isRichTextBlank(details)) return null;
  if (parseRichTextContent(details)?.type !== 'doc') return null;
  return renderRichTextDocumentHtml(details);
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
      details: string | null;
    }>;
  }>,
  locale: string
): FeaturedWorkRow[] {
  return works.flatMap((work) => {
    // A blank title is unusable, so it must not shadow a usable `en` fallback.
    const usable = work.translations.filter((t) => t.title.trim() !== '');
    const translation = getTranslatedContent(usable, locale);
    if (!translation) return [];
    return [
      {
        id: work.id,
        title: translation.title,
        description: translation.description,
        // Row-level: the body comes from the translation the title came from.
        detailsHtml: toDetailsHtml(translation.details),
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
              select: {
                language: true,
                title: true,
                description: true,
                details: true,
              },
            },
          },
        });

        return { rows: toRows(works, locale) };
      },
      {
        cache: true,
        // Versioned: rows cached before `detailsHtml` existed would otherwise
        // serve without it. No `revalidate` is set, so they never expire by time.
        cacheKey: ['featured-works-rows-v2'],
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
