import type { MetadataRoute } from 'next';
import { host } from '@/shared/config/host';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/private/',
    },
    sitemap: `${host}/sitemap.xml`,
  };
}
