import { NextResponse } from 'next/server';

import { host } from '@/shared/config/host';
import { routing } from '@/shared/i18n/routing';

export async function GET() {
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${routing.locales
    .map(
      (locale) => `
  <sitemap>
    <loc>${host}/${locale}/sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`
    )
    .join('')}
</sitemapindex>`;

  return new NextResponse(sitemapIndex, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
