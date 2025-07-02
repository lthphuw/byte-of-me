import { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Project } from '@db/index';
import { Locale } from 'next-intl';

// Import Locale from next-intl
import { host } from '@/config/host';
import { fetchData } from '@/lib/fetch';

async function getDynamicRoutes(): Promise<string[]> {
  const projects = await fetchData<Project[]>('me/projects');
  return projects.map((project) => `/projects/${project.id}`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Define static routes
  const staticRoutes = ['/', '/about', '/experience', '/projects', '/contact'];

  // Fetch dynamic routes
  const dynamicRoutes = await getDynamicRoutes();

  // Combine all routes
  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  // Generate sitemap entries for each route and locale
  return allRoutes.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: getUrl(href, locale),
      lastModified: new Date(),
      changeFrequency: href === '/' ? ('daily' as const) : ('weekly' as const),
      priority: href === '/' ? 1.0 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((cur) => [cur, getUrl(href, cur)])
        ),
      },
    }))
  );
}

type Href = Parameters<typeof getPathname>[0]['href'];

function getUrl(href: Href, locale: Locale): string {
  try {
    const pathname = getPathname({ locale, href });
    return `${host}${pathname}`.replace(/\/$/, ''); // Remove trailing slash
  } catch (error) {
    console.error(
      `Error generating URL for href: ${href}, locale: ${locale}`,
      error
    );
    return `${host}/${locale}`; // Fallback to homepage
  }
}
