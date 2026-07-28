import { logger } from '@byte-of-me/logger';
import type { MetadataRoute } from 'next';
import type { Locale } from 'next-intl';

import { getPublishedBlogSlugs } from '@/entities/blog/api/get-published-blog-slugs';
import { host } from '@/shared/config/host';
import { sitemapConfig } from '@/shared/config/sitemap';
import { getPathname } from '@/shared/i18n/navigation';
import { routing } from '@/shared/i18n/routing';

async function getDynamicRoutes(): Promise<string[]> {
  const slugs = await getPublishedBlogSlugs();

  return slugs.map((slug) => `/blogs/${slug}`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = Object.keys(sitemapConfig);
  const dynamicRoutes = await getDynamicRoutes();
  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  return allRoutes.flatMap((href) =>
    routing.locales.map((locale) => {
      const config = sitemapConfig[href] || {
        priority: 0.75,
        changeFrequency: 'monthly',
      };

      return {
        url: getUrl(href, locale),
        lastModified: new Date(),
        changeFrequency: config.changeFrequency,
        priority: config.priority,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((cur) => [cur, getUrl(href, cur)])
          ),
        },
      };
    })
  );
}

function getUrl(href: string, locale: Locale): string {
  try {
    const pathname = getPathname({ locale, href });
    return `${host}${pathname}`.replace(/\/$/, '');
  } catch (error) {
    logger.error(`Error generating URL for href: ${href}, locale: ${locale}`, {
      error,
    });
    return `${host}/${locale}`;
  }
}
