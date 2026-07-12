import { redirect } from '@/shared/i18n/navigation';
import { routing } from '@/shared/i18n/routing';
import type { LocaleType } from '@/shared/types';

interface ExperiencesPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The Experience page is intentionally hidden: its nav links are removed and
// the route redirects to the homepage. To bring it back, restore the original
// page body (`setRequestLocale(locale); return <ExperienceContent />;`).
export default async function ExperiencesPage({ params }: ExperiencesPageProps) {
  const { locale } = await params;

  redirect({ href: '/', locale: locale as LocaleType });
}
