import { prisma } from '@byte-of-me/db';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getPublicBlogBySlug } from '@/entities/blog/api/get-public-blog-by-slug';
import { routing } from '@/shared/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { BlogDetailsContent } from '@/widgets/public';

export async function generateStaticParams() {
  const blogs = await prisma.blog.findMany({
    where: { isPublished: true },
    select: { slug: true },
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
    notFound();
  }

  return <BlogDetailsContent blog={blog} />;
}
