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
  const t = await getTranslations('metadata.cv');
  const url = `${host}/${locale}/cv`;

  return {
    title: `${t('title')}`,
    description: t('description'),
    keywords: [
      'Việc làm',
      'CV',
      'Sơ yếu lý lịch',
      'Thông tin cá nhân',
      'Curriculum vitae',
      'CV',
      'Resume',
      ...siteConfig.keywords,
    ].map(key => key.toLowerCase()),
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/cv`,
        en: `${siteConfig.url}/en/cv`,
        fr: `${siteConfig.url}/fr/cv`,
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
interface CVLayoutProps {
  children?: React.ReactNode;
}

export default async function CVLayout({ children }: CVLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
