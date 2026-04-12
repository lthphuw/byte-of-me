import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { host } from '@/shared/config/host';
import { siteConfig } from '@/shared/config/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.blogs');
  const url = `${host}/${locale}/blogs`;

  return {
    title: t('title'),
    description: t('description'),
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
      title: `${t('title')} | ${siteConfig.name}`,
      description: t('description'),
      url,
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      siteName: 'Byte of me',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('title')} | ${siteConfig.name}`,
      description: t('description'),
      creator: '@lthphuw',
    },
  };
}

interface BlogsLayoutProps {
  children?: React.ReactNode;
}

export default async function BlogsLayout({
  children,
}: BlogsLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
