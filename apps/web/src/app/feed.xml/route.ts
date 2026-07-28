import { getPublicFeedBlogs } from '@/entities/blog/api/get-public-feed-blogs';
import { host } from '@/shared/config/host';
import { siteConfig } from '@/shared/config/site';
import { routing } from '@/shared/i18n/routing';

// The feed only changes when a post is published; an hour of staleness is fine
// and keeps the route static-cacheable at the edge.
export const revalidate = 3600;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  // The feed is single-language: the site's default locale.
  const language = routing.defaultLocale;
  const blogs = await getPublicFeedBlogs();

  const items = blogs
    .map((blog) => {
      const url = `${host}/${language}/blogs/${blog.slug}`;
      const pubDate = blog.publishedAt.toUTCString();

      return [
        '    <item>',
        `      <title>${xmlEscape(blog.title)}</title>`,
        `      <link>${xmlEscape(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        blog.description
          ? `      <description>${xmlEscape(blog.description)}</description>`
          : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(siteConfig.name)}</title>
    <link>${xmlEscape(host)}</link>
    <description>${xmlEscape(
      siteConfig.description ?? siteConfig.name
    )}</description>
    <language>${language}</language>
    <atom:link href="${xmlEscape(
      `${host}/feed.xml`
    )}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
