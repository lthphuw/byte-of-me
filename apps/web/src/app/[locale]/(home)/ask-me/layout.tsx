import { Metadata } from 'next';
import { AssistantProvider } from '@/contexts/assistant';
import { getTranslations } from 'next-intl/server';

import { host } from '@/config/host';
import { siteConfig } from '@/config/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.askMe');
  const url = `${host}/${locale}/ask-me`;

  return {
    title: t('title'),
    description: t('description'),
    keywords: [
      'ai',
      'chat',
      'ai chat',
      'chat bot',
      'rag',
      "phu's assistant",
      'chat assistant',
      'assistant',
      'anything',
      'ask me anything',
      ...siteConfig.keywords,
    ].map((key) => key.toLowerCase()),
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/ask-me`,
        en: `${siteConfig.url}/en/ask-me`,
        fr: `${siteConfig.url}/fr/ask-me`,
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

interface MoreLayoutProps {
  children?: React.ReactNode;
}

export default async function AskMeLayout({ children }: MoreLayoutProps) {
  return (
    <AssistantProvider>
      <div className="flex flex-col gap-6">{children}</div>
    </AssistantProvider>
  );
}
