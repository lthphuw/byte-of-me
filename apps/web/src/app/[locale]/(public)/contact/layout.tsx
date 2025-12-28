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
  const t = await getTranslations('metadata.contact');
  const url = `${host}/${locale}/contact`;

  return {
    title: `${t('title')}`,
    description: t('description'),
    keywords: [
      'Việc làm',
      'Kết nối',
      'Liên hệ',
      'Thông tin liên lạc',
      'Liên lạc',
      'Contact',
      ...siteConfig.keywords,
    ].map((key) => key.toLowerCase()),
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/contact`,
        en: `${siteConfig.url}/en/contact`,
        fr: `${siteConfig.url}/fr/contact`,
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

interface ContactLayoutProps {
  children?: React.ReactNode;
}

export default async function ContactLayout({ children }: ContactLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
