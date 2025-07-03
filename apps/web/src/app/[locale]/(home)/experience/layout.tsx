import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { host } from '@/config/host';
import { siteConfig } from '@/config/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.experience');
  const url = `${host}/${locale}/experience`;

  return {
    title: t('title'),
    description: t('description'),
    keywords: [
      'Kinh nghiệm',
      'Việc làm',
      'Kinh nghiệm việc làm',
      'Experience',
      ...siteConfig.keywords,
    ],
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/experience`,
        en: `${siteConfig.url}/en/experience`,
        fr: `${siteConfig.url}/fr/experience`,
      },
    },
    openGraph: {
      title: `${t('title')} | ${siteConfig.name}`,
      description: t('description'),
      url,
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : locale === 'fr' ? 'fr_FR' : 'en_US',
      siteName: 'Byte of me',
      images: [`${siteConfig.url}/images/avatars/HaNoi2024.jpeg`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('title')} | ${siteConfig.name}`,
      description: t('description'),
      images: [`${siteConfig.url}/images/avatars/HaNoi2024.jpeg`],
      creator: '@lthphuw',
    },
  };
}

interface ExperienceLayoutProps {
  children?: React.ReactNode;
}

export default async function ExperienceLayout({
  children,
}: ExperienceLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
