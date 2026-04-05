import { Metadata } from 'next';

import { host } from '@/config/host';
import { siteConfig } from '@/config/site';
import { getTranslations } from '@/lib/i18n';





export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.about');
  const url = `${host}/${locale}/about`;

  return {
    title: t('title'),
    description: t('description'),
    keywords: [
      'Về bản thân tôi',
      'Giới thiệu',
      'About Me',
      ...siteConfig.keywords,
    ].map((key) => key.toLowerCase()),
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/about`,
        en: `${siteConfig.url}/en/about`,
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

interface AboutLayoutProps {
  children?: React.ReactNode;
}

export default async function AboutLayout({ children }: AboutLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
