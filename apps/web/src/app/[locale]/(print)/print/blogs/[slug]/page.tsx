import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

// The PUBLIC read by deep path, as `(public)/blogs/[slug]/page.tsx` imports it: its query filters
// `isPublished: true`, so a draft is never in the result set. No admin read is reachable from here.
import { getPublicBlogBySlug } from '@/entities/blog/api/get-public-blog-by-slug';
import { BlogPrintTrigger } from '@/features/public/blog-print';
import { formatDate, isMeaningfullyUpdated } from '@/shared/lib/utils';
// Deep path, not the barrel: it would pull the whole shared-ui surface onto a
// page that renders one article.
import { PrintableDocument } from '@/shared/ui/printable-document';

const BASE_METADATA: Metadata = {
  // Not indexable, because this is a
  // second URL for an article that already has a canonical one, and letting a
  // crawler have it splits the post between two results.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * The title is Chrome's default PDF filename; `absolute` skips the layout's `%s | Byte of me` template.
 * Leaks nothing: only published titles resolve; an unknown or unpublished slug gets the generic label
 * while the page below 404s.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [res, t] = await Promise.all([
    getPublicBlogBySlug(slug),
    getTranslations('metadata'),
  ]);
  const title = res.success ? res.data.title.trim() : '';

  return {
    ...BASE_METADATA,
    title: { absolute: title || t('blogs.title') },
  };
}

/**
 * The printable article. `PrintableDocument` is the page itself — this route
 * only resolves which article, and how its byline reads.
 */
export default async function BlogPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ slug, locale }, { print }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [res, t] = await Promise.all([
    getPublicBlogBySlug(slug),
    getTranslations('blogDetails'),
  ]);

  // No distinction between "unknown slug" and "not published" — both are 404,
  // the same discipline the public detail route follows. Anything else would
  // turn this URL into an oracle for unreleased posts.
  if (!res.success) notFound();

  const blog = res.data;
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const publishedOn = blog.publishedDate ?? blog.createdAt;
  const updatedLabel = isMeaningfullyUpdated(publishedOn, blog.updatedAt)
    ? t('updatedOn', {
        date: formatDate(blog.updatedAt, locale, dateOptions) ?? '',
      })
    : null;

  return (
    <PrintableDocument
      title={blog.title}
      byline={[
        blog.author?.name,
        formatDate(publishedOn, locale, dateOptions),
        updatedLabel,
      ]
        .filter(Boolean)
        .join(' · ')}
      content={blog.content}
    >
      <BlogPrintTrigger auto={print === '1'} />
    </PrintableDocument>
  );
}
