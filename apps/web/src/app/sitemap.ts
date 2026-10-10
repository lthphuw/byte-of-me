import { logger } from '@byte-of-me/logger';
import type { MetadataRoute } from 'next';
import type { Locale } from 'next-intl';

import { getPublishedBlogs } from '@/entities/blog/api/get-published-blogs';
import { host } from '@/shared/config/host';
import { sitemapConfig } from '@/shared/config/sitemap';
import { getPathname } from '@/shared/i18n/navigation';
import { routing } from '@/shared/i18n/routing';

interface SitemapRoute {
  href: string;
  lastModified?: Date;
}

async function getDynamicRoutes(): Promise<SitemapRoute[]> {
  const blogs = await getPublishedBlogs();

  return blogs.map((blog) => ({
    href: `/blogs/${blog.slug}`,
    lastModified: blog.updatedAt,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages carry no lastModified: nothing records when the homepage or a
  // list page last changed, and a guessed date is worse than none.
  const staticRoutes: SitemapRoute[] = Object.keys(sitemapConfig).map(
    (href) => ({ href })
  );
  const dynamicRoutes = await getDynamicRoutes();
  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  return allRoutes.flatMap(({ href, lastModified }) =>
    routing.locales.map((locale) => {
      const config = sitemapConfig[href] || {
        priority: 0.75,
        changeFrequency: 'monthly',
      };

      return {
        url: getUrl(href, locale),
        lastModified,
        changeFrequency: config.changeFrequency,
        priority: config.priority,
        alternates: {
          languages: {
            ...Object.fromEntries(
              routing.locales.map((cur) => [cur, getUrl(href, cur)])
            ),
            'x-default': getUrl(href, routing.defaultLocale),
          },
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
