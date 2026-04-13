import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { ContactContent } from '@/widgets/public/contact-content/ui';

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  return <ContactContent />;
}
