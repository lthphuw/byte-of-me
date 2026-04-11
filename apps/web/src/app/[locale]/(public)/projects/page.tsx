import { routing } from '@/i18n/routing';
import { LocaleType } from '@/shared/types';
import { ProjectsContent } from '@/widgets/projects-content/ui/projects-content';
import { setRequestLocale } from 'next-intl/server';

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
