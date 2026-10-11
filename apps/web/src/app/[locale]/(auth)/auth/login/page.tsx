import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { siteConfig } from '@/shared/config/site';
import { AdminAuthLogInView } from '@/widgets/auth/admin-auth-log-in-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.login');
  const fullTitle = `${t('title')} | ${siteConfig.name}`;

  return {
    title: t('title'),
    description: t('description'),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    openGraph: {
      title: fullTitle,
      description: t('description'),
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description: t('description'),
    },
  };
}

export default function LoginPage() {
  return <AdminAuthLogInView />;
}
