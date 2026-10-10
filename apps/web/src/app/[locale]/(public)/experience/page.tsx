import { redirect } from '@/shared/i18n/navigation';
import { routing } from '@/shared/i18n/routing';
import type { LocaleType } from '@/shared/types';

interface ExperiencesPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Hidden: nav links are gone and next.config.js redirects the route, so this body
// runs only once that rule is removed. To bring it back, remove the rule and
// restore the body (`setRequestLocale(locale); return <ExperienceContent />;`).
export default async function ExperiencesPage({ params }: ExperiencesPageProps) {
  const { locale } = await params;

  redirect({ href: '/', locale: locale as LocaleType });
}
