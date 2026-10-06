import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getOpenSourceContributions } from '@/entities/open-source/api/get-open-source-contributions';
import { getPaginatedPublicProjects, projectKeys } from '@/entities/project';
import { getPaginatedPublicTags, tagKeys } from '@/entities/tag';
import {
  getPaginatedPublicTechStacks,
  techStackKeys,
} from '@/entities/tech-stack';
import {
  DEFAULT_PROJECT_FILTERS,
  PROJECT_FILTER_FACET_LIMIT,
  ProjectsOpenSource,
} from '@/features/public';
import { routing } from '@/shared/i18n/routing';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';
import type { LocaleType } from '@/shared/types';
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

  // Server-render the default (unfiltered) first page so its data ships in the
  // initial HTML instead of a skeleton shell. The key and the params must match
  // the widget's `useQuery` exactly or hydration falls back to a client fetch.
  // `DEFAULT_PROJECT_FILTERS` is the exact shape `useProjectFilters` produces
  // when the URL carries no filter params (`{ tagSlugs: [], techStackSlugs:
  // [], search: '' }`), so the prefetch key and the client key stay
  // structurally identical instead of drifting as two hand-kept literals. It
  // resolves to `project-filters/lib/project-filter-params`, which carries no
  // `'use client'` directive — imported out of the hook file it arrived here
  // as a client-reference proxy and the hash drifted.
  //
  // The tag and tech-stack chip rows are prefetched in the same pass, with the
  // keys and limit `ProjectFilters` uses; otherwise they are two more client
  // actions after hydration and the rows pop in. Nothing here depends on
  // anything else, so it all runs at once.
  const queryClient = getQueryClient();
  const [openSourceResp, tOss] = await Promise.all([
    getOpenSourceContributions(),
    getTranslations('components.openSource'),
    queryClient.prefetchQuery({
      queryKey: projectKeys.publicList(1, DEFAULT_PROJECT_FILTERS),
      queryFn: () =>
        getPaginatedPublicProjects({
          ...DEFAULT_PROJECT_FILTERS,
          page: 1,
          limit: 8,
        }),
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: tagKeys.infinite(PROJECT_FILTER_FACET_LIMIT),
      queryFn: async ({ pageParam }) =>
        unwrapApiResponse(
          await getPaginatedPublicTags({
            page: pageParam,
            limit: PROJECT_FILTER_FACET_LIMIT,
          })
        ),
      initialPageParam: 1,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: techStackKeys.infinite(PROJECT_FILTER_FACET_LIMIT),
      queryFn: async ({ pageParam }) =>
        unwrapApiResponse(
          await getPaginatedPublicTechStacks({
            page: pageParam,
            limit: PROJECT_FILTER_FACET_LIMIT,
          })
        ),
      initialPageParam: 1,
    }),
  ]);

  // Rendered here, on the server, and handed to the client page as a node. An
  // empty result (no token, GitHub down) passes `null`, which drops the tab.
  const repos = openSourceResp.success ? openSourceResp.data.repos : [];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsContent
        openSource={
          repos.length > 0
            ? {
                list: <ProjectsOpenSource repos={repos} />,
                summary: tOss('summary', {
                  prs: repos.reduce((sum, repo) => sum + repo.prCount, 0),
                  repos: repos.length,
                }),
              }
            : null
        }
      />
    </HydrationBoundary>
  );
}
