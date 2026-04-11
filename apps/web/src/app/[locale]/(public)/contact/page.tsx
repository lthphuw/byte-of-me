import { routing } from '@/i18n/routing';
import { LocaleType } from '@/shared/types';
import { ContactContent } from '@/widgets/contact-content/ui';
import { setRequestLocale } from 'next-intl/server';

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
