import { prisma } from '@byte-of-me/db';

import { routing } from '@/shared/i18n/routing';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';

/** Newest published posts exposed by the RSS feed. */
const FEED_ITEM_LIMIT = 30;

export type PublicFeedBlog = {
  slug: string;
  title: string;
  description: Maybe<string>;
  /** publishedDate when set, createdAt otherwise. */
  publishedAt: Date;
};

/**
 * The most recent published posts, shaped for the RSS feed.
 *
 * Plain server module rather than a `'use server'` action for the same reason as
 * `getPublishedBlogSlugs`: the feed route is statically rendered and the query is
 * locale-independent, so the locale-aware public-action wrapper adds nothing.
 */
export async function getPublicFeedBlogs(): Promise<PublicFeedBlog[]> {
  // The feed is single-language — the site's default locale — so only that
  // translation row is fetched and the heavy BlogTranslation.content column is
  // never selected.
  const language = routing.defaultLocale;

  const blogs = await prisma.blog.findMany({
    where: { isPublished: true },
    select: {
      slug: true,
      publishedDate: true,
      createdAt: true,
      translations: {
        where: { language },
        select: { language: true, title: true, description: true },
      },
    },
    orderBy: { publishedDate: 'desc' },
    take: FEED_ITEM_LIMIT,
  });

  return blogs.flatMap((blog) => {
    const translated = getTranslatedContent(blog.translations, language);
    if (!translated) return [];

    return [
      {
        slug: blog.slug,
        title: translated.title,
        description: translated.description,
        publishedAt: blog.publishedDate ?? blog.createdAt,
      },
    ];
  });
}
