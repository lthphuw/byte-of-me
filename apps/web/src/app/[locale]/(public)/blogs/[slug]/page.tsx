import { getPaginatedPublicBlogs } from '@/entities/blog';
import { getPublicBlogBySlug } from '@/entities/blog/api/get-public-blog-by-slug';
import { BlogNotFound } from '@/entities/blog/ui';
import { routing } from '@/i18n/routing';
import { LocaleType } from '@/shared/types';
import { BlogDetailsShell } from '@/widgets/blog-details/ui';
import BlogDetails from '@/widgets/blog-details/ui/blog-details';
import { setRequestLocale } from 'next-intl/server';

export async function generateStaticParams() {
  const { data } = await getPaginatedPublicBlogs({
    page: 1,
    limit: 100,
  });
  const blogs = data?.data;

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

  return <BlogDetails blog={blog} />;
}
