import { getPublicFeedBlogs } from '@/entities/blog/api/get-public-feed-blogs';
import { host } from '@/shared/config/host';
import { siteConfig } from '@/shared/config/site';
import { routing } from '@/shared/i18n/routing';

// Same cadence as the feed: the list only changes when a post is published.
export const revalidate = 3600;

// A curated index for AI assistants, not UI text, so the labels stay out of the
// next-intl catalogues. Like the feed, it is English only.
const PAGES = [
  { label: 'Home', path: '' },
  { label: 'Projects', path: '/projects' },
  { label: 'Blogs', path: '/blogs' },
  { label: 'Contact', path: '/contact' },
];

/** Markdown link text cannot hold brackets, and a summary must stay on one line. */
function inline(value: string): string {
  return value.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  const language = routing.defaultLocale;
  const base = `${host}/${language}`;
  const blogs = await getPublicFeedBlogs();

  const lines = [
    `# ${siteConfig.name}`,
    '',
    `> ${inline(siteConfig.description)}`,
    '',
    'Vietnamese versions of these pages live under /vi with the same paths.',
    '',
    '## Pages',
    '',
    ...PAGES.map(({ label, path }) => `- [${label}](${base}${path})`),
    '',
    '## Blog posts',
    '',
    ...blogs.map((blog) => {
      const link = `- [${inline(blog.title)}](${base}/blogs/${blog.slug})`;
      return blog.description ? `${link}: ${inline(blog.description)}` : link;
    }),
  ];

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
