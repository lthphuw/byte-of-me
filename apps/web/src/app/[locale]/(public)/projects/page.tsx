import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { setRequestLocale } from 'next-intl/server';

import { getPaginatedPublicProjects, projectKeys } from '@/entities/project';
import { routing } from '@/shared/i18n/routing';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
import type { LocaleType } from '@/shared/types';
import { ProjectsContent } from '@/widgets/public';

interface ProjectsPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Mirrors the unfiltered first page rendered by `ProjectsContent`. */
const DEFAULT_FILTERS = { tagSlugs: [], techStackSlugs: [], search: '' };

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  // Server-render the default (unfiltered) first page so its data ships in the
  // initial HTML instead of a skeleton shell. The key and the params must match
  // the widget's `useQuery` exactly or hydration falls back to a client fetch.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: projectKeys.publicList(1, DEFAULT_FILTERS),
    queryFn: () =>
      getPaginatedPublicProjects({ ...DEFAULT_FILTERS, page: 1, limit: 8 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsContent />
    </HydrationBoundary>
  );
}
