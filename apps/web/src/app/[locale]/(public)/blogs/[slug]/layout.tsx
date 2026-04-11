import { Metadata } from 'next';
import { getPublicBlogBySlug } from '@/entities/blog/api/get-public-blog-by-slug';
import { host } from '@/shared/config/host';
import { siteConfig } from '@/shared/config/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { data: blog, success } = await getPublicBlogBySlug(slug);

  const url = `${host}/${locale}/blogs/${slug}`;
  if (!success) {
    return {
      title: '',
      description: '',
      keywords: ['Bài viết', 'Blogs', ...siteConfig.keywords].map((key) =>
        key.toLowerCase()
      ),
    };
  }

  return {
    title: blog?.title,
    description: blog?.description,
    keywords: ['Bài viết', 'Blogs', ...siteConfig.keywords].map((key) =>
      key.toLowerCase()
    ),
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/blogs`,
        en: `${siteConfig.url}/en/blogs`,
      },
    },
    openGraph: {
      title: `${blog?.title} | ${siteConfig.name}`,
      description: blog?.description || '',
      url,
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      siteName: 'Byte of me',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${blog?.title} | ${siteConfig.name}`,
      description: blog?.description || '',
      creator: '@lthphuw',
    },
  };
}

interface BlogsLayoutProps {
  children?: React.ReactNode;
}

export default async function BlogsLayout({ children }: BlogsLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
