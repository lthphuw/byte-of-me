import type { MetadataRoute } from 'next';

import { host } from '@/shared/config/host';
import { routing } from '@/shared/i18n/routing';

// Served bare (before the locale redirect) and under each locale prefix.
const DASHBOARD_PATHS = [
  '/dashboard',
  ...routing.locales.map((locale) => `/${locale}/dashboard`),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // `/api/og` serves share images. Listed first for crawlers that stop at
      // the first match.
      allow: ['/api/og'],
      disallow: [...DASHBOARD_PATHS, '/api/'],
    },
    sitemap: `${host}/sitemap.xml`,
  };
}
