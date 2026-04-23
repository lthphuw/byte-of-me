import type { Metadata } from 'next';
import { getPublicUserProfile } from '@/entities';

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
  const { data: author } = await getPublicUserProfile();

  const url = `${host}/${locale}/blogs/${slug}`;

  if (!success || !blog) {
    return {
      title: 'Blog not found',
      description: '',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const image = blog?.coverImage?.url;
  const authorName = author?.displayName || 'Phu Luong';
  return {
    title: blog.title,
    description: blog.description || '',
    keywords: [
      'bài viết',
      'blog',
      ...siteConfig.keywords,
      ...(blog.tags.map((t) => t.name) || []),
    ].map((k) => k.toLowerCase()),

    authors: [{ name: authorName }],
    creator: authorName,
    publisher: siteConfig.name,

    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/blogs/${slug}`,
        en: `${siteConfig.url}/en/blogs/${slug}`,
      },
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
      },
    },

    openGraph: {
      title: `${blog.title} | ${siteConfig.name}`,
      description: blog.description || '',
      url,
      type: 'article',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      siteName: siteConfig.name,

      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: blog.title,
            },
          ]
        : [],

      publishedTime: blog?.createdAt
        ? new Date(blog.createdAt).toISOString()
        : undefined,
      modifiedTime: blog?.updatedAt
        ? new Date(blog.updatedAt).toISOString()
        : undefined,
      authors: [authorName],
      tags: blog.tags.map((t) => t.name) || [],
    },

    twitter: {
      card: 'summary_large_image',
      title: `${blog.title} | ${siteConfig.name}`,
      description: blog.description || '',
      creator: '@lthphuw',
      images: image ? [image] : [],
    },

    category: 'technology',
  };
}

interface BlogDetailsLayoutProps {
  children?: React.ReactNode;
}

export default async function BlogDetailsLayout({
  children,
}: BlogDetailsLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
