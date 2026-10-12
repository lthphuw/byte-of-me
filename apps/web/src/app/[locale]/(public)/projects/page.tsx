import type { ReactNode } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getOpenSourceContributions } from '@/entities/open-source/api/get-open-source-contributions';
import { projectQueries } from '@/entities/project/query';
import { tagQueries } from '@/entities/tag/query';
import { techStackQueries } from '@/entities/tech-stack/query';
import {
  DEFAULT_PROJECT_FILTERS,
  PROJECT_FILTER_FACET_LIMIT,
  ProjectsOpenSource,
} from '@/features/public';
import { routing } from '@/shared/i18n/routing';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
import type { LocaleType } from '@/shared/types';
import { SectionLoadError } from '@/shared/ui';
import { ProjectsContent } from '@/widgets/public';

interface ProjectsPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  // The server renders the unfiltered first page and both chip rows, so none of
  // them waits for a client action after hydration. Each prefetch calls the same
  // factory the client hook calls, so the key and the query cannot drift. A failed
  // prefetch is not dehydrated, and the client shows its own error state.
  // `DEFAULT_PROJECT_FILTERS` lives in a module without `'use client'`: imported
  // from the hook file, it became a client reference and the query hash drifted.
  const queryClient = getQueryClient();
  const [openSourceResp, tOss, tError] = await Promise.all([
    getOpenSourceContributions(),
    getTranslations('components.openSource'),
    getTranslations('components.sectionLoadError'),
    queryClient.prefetchQuery(
      projectQueries.publicList(1, DEFAULT_PROJECT_FILTERS)
    ),
    queryClient.prefetchInfiniteQuery(
      tagQueries.infinite(PROJECT_FILTER_FACET_LIMIT)
    ),
    queryClient.prefetchInfiniteQuery(
      techStackQueries.infinite(PROJECT_FILTER_FACET_LIMIT)
    ),
  ]);

  // Rendered here, on the server, and handed to the client page as nodes. A failed
  // read keeps the tab and shows its error, with a retry, in the Open source view.
  // No repos (no token, or none merged) passes `null`, which drops the tab.
  let openSource: { list: ReactNode; summary?: string } | null = null;
  if (!openSourceResp.success) {
    openSource = {
      list: (
        <SectionLoadError
          title={tError('title')}
          description={tError('description')}
        />
      ),
    };
  } else if (openSourceResp.data.repos.length > 0) {
    const repos = openSourceResp.data.repos;
    openSource = {
      list: <ProjectsOpenSource repos={repos} />,
      summary: tOss('summary', {
        prs: repos.reduce((sum, repo) => sum + repo.prCount, 0),
        repos: repos.length,
      }),
    };
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsContent openSource={openSource} />
    </HydrationBoundary>
  );
}
