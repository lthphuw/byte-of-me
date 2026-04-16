import { getPublicBlogBySlug } from '@/entities/blog/api/get-public-blog-by-slug';
import { BlogNotFound } from '@/entities/blog/ui';
import { routing } from '@/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { BlogDetailsContent, BlogDetailsShell } from '@/widgets/public';

import { prisma } from '@byte-of-me/db';
import { setRequestLocale } from 'next-intl/server';

export async function generateStaticParams() {
  const blogs = await prisma.blog.findMany({
    where: { isPublished: true },
    select: { slug: true },
    take: 100,
  });

  if (!blogs) return [];

  return blogs.flatMap((blog) =>
    routing.locales.map((locale) => ({
      locale,
      slug: blog.slug,
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
    return (
      <BlogDetailsShell>
        <BlogNotFound />
      </BlogDetailsShell>
    );
  }

  return <BlogDetailsContent blog={blog} />;
}
