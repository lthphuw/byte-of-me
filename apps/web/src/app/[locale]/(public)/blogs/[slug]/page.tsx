import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getPublicBlogBySlug } from '@/entities/blog/api/get-public-blog-by-slug';
import { getPublishedBlogSlugs } from '@/entities/blog/api/get-published-blog-slugs';
import { host } from '@/shared/config/host';
import { routing } from '@/shared/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { BlogDetailsContent } from '@/widgets/public';

export async function generateStaticParams() {
  const slugs = await getPublishedBlogSlugs();

  return slugs.flatMap((slug) =>
    routing.locales.map((locale) => ({
      locale,
      slug,
    }))
  );
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  setRequestLocale(locale as LocaleType);

  const { data: blog, success } = await getPublicBlogBySlug(slug);

  if (!success || !blog) {
    notFound();
  }

  // Structured data for search engines. `</script>`-safe: every `<` in the
  // payload is escaped, so stored content can never close the tag early.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.description ?? undefined,
    // `new Date(...)` on purpose: this blog goes through Next's data cache,
    // and a cache hit hands back serialized Dates as strings.
    datePublished: new Date(blog.publishedDate ?? blog.createdAt).toISOString(),
    dateModified: new Date(blog.updatedAt).toISOString(),
    inLanguage: locale,
    image: blog.coverImage?.url ?? undefined,
    keywords: blog.tags.map((tag) => tag.name).join(', ') || undefined,
    author: blog.author?.name
      ? { '@type': 'Person', name: blog.author.name }
      : undefined,
    mainEntityOfPage: `${host}/${locale}/blogs/${blog.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <BlogDetailsContent blog={blog} />
    </>
  );
}
