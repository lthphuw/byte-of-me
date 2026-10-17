import type { ApiResponse } from '@byte-of-me/api-core';
import {
  CACHE_TAGS,
  getTranslatedContent,
  getTranslationLanguages,
} from '@byte-of-me/api-core';
import {
  FEATURED_WORK_LINKS_MAX,
  FEATURED_WORK_MEDIA_MAX,
} from '@byte-of-me/contracts/featured-work';
import { ACCEPTED_VIDEO_MIME_TYPES } from '@byte-of-me/contracts/media';
import { prisma } from '@byte-of-me/db';
import { parseGithubPullRequestUrl } from '@byte-of-me/github';
import { renderRichTextDocumentHtml } from '@byte-of-me/rich-text-render/rich-text-render';
import {
  isRichTextBlank,
  parseRichTextContent,
} from '@byte-of-me/rich-text-schema/rich-text-content';

import {
  defaultFeaturedWorkGithubDeps,
  type FeaturedWorkGithubDeps,
  getFeaturedWorkGithub,
} from '@/entities/featured-work/lib/get-featured-work-github';
import { safeLink } from '@/entities/featured-work/lib/safe-link';
import type {
  PublicFeaturedWork,
  PublicFeaturedWorkLink,
  PublicFeaturedWorkMedia,
} from '@/entities/featured-work/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';

const MAX_WORKS = 6;

/** A link before GitHub is asked about it: `github` is added by the loader. */
type LinkRow = Omit<PublicFeaturedWorkLink, 'github'>;

type FeaturedWorkRow = Pick<PublicFeaturedWork, 'id' | 'title' | 'detailsHtml' | 'media'> & {
  links: LinkRow[];
};

interface StoredLink {
  id: string;
  url: string;
  label: string | null;
}

interface StoredDemoItem {
  label: string | null;
  media: {
    id: string;
    url: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  };
}

/**
 * The demo pair a visitor may be served. The database is not trusted any more than
 * it is for `url`: an item whose file is not an http(s) url, or is not an image or
 * an accepted video, is dropped on its own and never blanks its siblings.
 */
function toPublicMedia(items: StoredDemoItem[]): PublicFeaturedWorkMedia[] {
  return items
    .flatMap(({ label, media }) => {
      const isPlayable =
        media.mimeType.startsWith('image/') ||
        (ACCEPTED_VIDEO_MIME_TYPES as readonly string[]).includes(
          media.mimeType
        );
      if (!isPlayable || safeLink(media.url).url === null) return [];
      return [
        {
          id: media.id,
          url: media.url,
          mimeType: media.mimeType,
          label,
          width: media.width,
          height: media.height,
        },
      ];
    })
    .slice(0, FEATURED_WORK_MEDIA_MAX);
}

/**
 * The proof links a visitor may be served, in the order stored. A link whose url is not
 * http(s) is dropped on its own, and the list is capped, as the demo pair is.
 */
function toPublicLinks(stored: StoredLink[]): LinkRow[] {
  return stored
    .flatMap(({ id, url, label }) => {
      const safe = safeLink(url);
      if (safe.url === null || safe.host === null) return [];
      const ref = parseGithubPullRequestUrl(safe.url);
      return [
        {
          id,
          url: safe.url,
          label,
          host: safe.host,
          pr: ref ? { repo: `${ref.owner}/${ref.repo}`, number: ref.number } : null,
        },
      ];
    })
    .slice(0, FEATURED_WORK_LINKS_MAX);
}

/**
 * Sanitized HTML of one row's details, or null. Runs inside the cached handler,
 * so a cache hit skips TipTap and the sanitizer. Only a `doc` that renders is a
 * body: anything else shows no details, and the stored JSON is never printed.
 */
function toDetailsHtml(details: string | null): string | null {
  if (isRichTextBlank(details)) return null;
  if (parseRichTextContent(details)?.type !== 'doc') return null;
  return renderRichTextDocumentHtml(details);
}

/**
 * The body for a visitor: the chosen translation's own, else `en`'s, else any other that
 * has one. The title and the body fall back separately, so a `vi` title with no `vi` body
 * shows the `en` body rather than none.
 */
function pickDetails(
  translations: Array<{ language: string; details: string | null }>,
  chosen: { details: string | null }
): string | null {
  const candidates = [
    chosen,
    ...translations.filter((t) => t.language === 'en'),
    ...translations,
  ];
  return candidates.find((t) => !isRichTextBlank(t.details))?.details ?? null;
}

/** A work with no usable translation is skipped: one bad row must not blank the section. */
export function toRows(
  works: Array<{
    id: string;
    /** In position order (the query sorts them). */
    links: StoredLink[];
    /** In slot order (the query sorts them). */
    media: StoredDemoItem[];
    translations: Array<{
      language: string;
      title: string;
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
        detailsHtml: toDetailsHtml(pickDetails(usable, translation)),
        links: toPublicLinks(work.links),
        media: toPublicMedia(work.media),
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
          where: { userId },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          take: MAX_WORKS,
          select: {
            id: true,
            links: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, url: true, label: true },
            },
            media: {
              orderBy: { sortOrder: 'asc' },
              select: {
                label: true,
                media: {
                  select: {
                    id: true,
                    url: true,
                    mimeType: true,
                    width: true,
                    height: true,
                  },
                },
              },
            },
            translations: {
              where: { language: { in: getTranslationLanguages(locale) } },
              orderBy: { language: 'asc' },
              select: {
                language: true,
                title: true,
                details: true,
              },
            },
          },
        });

        return { rows: toRows(works, locale) };
      },
      {
        cache: true,
        // Versioned: rows cached before `media` existed would otherwise serve
        // without it. No `revalidate` is set, so they never expire by time. v4: rows
        // cached before the first clip was attached, which a tag revalidation served stale.
        // v5: the demo items carry each file's pixel size, which v4 rows lack.
        // v6: no is_published filter any more, so v5 rows would hide the drafts that now show.
        // v7: a work's single `url` became `links`, so v6 rows carry no links at all.
        // v8: a work's body falls back to `en` per field, so v7 rows hold none for a `vi` visitor.
        cacheKey: ['featured-works-rows-v8'],
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
    rows.flatMap((row) => row.links.map((link) => link.url)),
    deps
  );

  return {
    success: true,
    data: {
      works: rows.map((row) => ({
        ...row,
        links: row.links.map((link) => ({
          ...link,
          github: github[link.url] ?? null,
        })),
      })),
    },
  };
}
