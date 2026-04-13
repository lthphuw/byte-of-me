import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { ProjectsContent } from '@/widgets/public/projects-content/ui/projects-content';

interface ProjectsPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  return <ProjectsContent />;
}
