import { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { prisma } from '@db/client';
import { Locale } from 'next-intl';

import { host } from '@/config/host';
import { sitemapConfig } from '@/config/sitemap';





async function getDynamicRoutes(): Promise<string[]> {
  const projects = await prisma.project.findMany({
    select: { id: true },
  });

  return projects.map((p) => `/projects/${p.id}`);
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
    console.error(
      `Error generating URL for href: ${href}, locale: ${locale}`,
      error
    );
    return `${host}/${locale}`;
  }
}
