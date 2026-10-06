'use client';

import type { ReactNode } from 'react';
import {
  Pagination,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Narrow import on purpose: `@/entities` re-exports every entity, so a
// client component importing it drags unrelated server-rendering modules
// (education-item -> RichText -> tiptap) into the public bundle.
import {
  getPaginatedPublicProjects,
  ProjectEmpty,
  projectKeys,
  ProjectTimelineItemSkeleton,
} from '@/entities/project';
import {
  ProjectFilters,
  useProjectFilters,
} from '@/features/public/project-filters';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { ListPageHeader } from '@/shared/ui';
import { ProjectsShell } from '@/widgets/public/projects-content/ui/projects-shell';
import { ProjectsTimeline } from '@/widgets/public/projects-content/ui/projects-timeline';

const OPEN_SOURCE_VIEW = 'open-source';

interface ProjectsContentProps {
  /**
   * The server-rendered Open source list and its one-line summary. Absent when
   * there is nothing to show, which also removes the tab switch. Handed in as a
   * node so none of that markup becomes client JavaScript.
   */
  openSource?: { list: ReactNode; summary: string } | null;
}

export function ProjectsContent({ openSource }: ProjectsContentProps) {
  const t = useTranslations('project');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // The URL is the source of truth, like the filters: a shared link opens on
  // the right tab and back/forward move between them.
  const view =
    openSource && searchParams.get('view') === OPEN_SOURCE_VIEW
      ? OPEN_SOURCE_VIEW
      : 'projects';
  // Always an explicit `?view=`, even for the default tab. Navigating back to
  // the bare pathname from `?view=open-source` is silently dropped by the Next
  // router (verified on a production build: `router.replace('/en/projects')`
  // leaves the URL and the tab untouched, while any URL with a query works), so
  // the Projects tab would never switch.
  const setView = (next: string) =>
    router.replace(`${pathname}?view=${next}`, { scroll: false });
  const tPagination = useTranslations('components.pagination');
  const { filters, page, updateFilters, setPage } = useProjectFilters();
  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.tagSlugs.length > 0 ||
    filters.techStackSlugs.length > 0;

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: projectKeys.publicList(page, filters),
    queryFn: () => getPaginatedPublicProjects({ ...filters, page, limit: 8 }),
    placeholderData: (previousData) => previousData,
    // Same as the blogs list: the hydrated entry carries the build's
    // `dataUpdatedAt`, so only `Infinity` stops it refetching on mount.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const projects = data?.data?.data || [];
  const pagination = data?.data?.meta || {
    currentPage: 1,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  };

  // Same reasoning as the blogs list: gating on `isFetching` hid the
  // already-rendered list behind skeletons whenever a refetch ran.
  const showSkeletons = isLoading;

  const toggleTag = (slug: string) => {
    const nextTags = filters.tagSlugs.includes(slug)
      ? filters.tagSlugs.filter((s) => s !== slug)
      : [...filters.tagSlugs, slug];

    updateFilters({ ...filters, tagSlugs: nextTags });
  };

  const toggleTech = (slug: string) => {
    const nextTech = filters.techStackSlugs.includes(slug)
      ? filters.techStackSlugs.filter((s) => s !== slug)
      : [...filters.techStackSlugs, slug];

    updateFilters({ ...filters, techStackSlugs: nextTech });
  };

  const tabs = openSource && (
    <TabsList className="self-start">
      <TabsTrigger value="projects">{t('tabProjects')}</TabsTrigger>
      <TabsTrigger value={OPEN_SOURCE_VIEW}>{t('tabOpenSource')}</TabsTrigger>
    </TabsList>
  );

  return (
    <ProjectsShell>
      <Tabs
        value={view}
        onValueChange={setView}
        className="flex flex-col gap-6 md:gap-8"
      >
        {/* No `description`, same as Blogs: the strapline restated the page title
            in more words. The count is the subtitle. */}
        {view === OPEN_SOURCE_VIEW && openSource ? (
          <ListPageHeader
            title={t('tabOpenSource')}
            count={openSource.summary}
          >
            {tabs}
          </ListPageHeader>
        ) : (
          <ListPageHeader
            title={t('pageTitle')}
            count={t('count', { count: pagination.totalCount })}
          >
            {tabs}
            <ProjectFilters value={filters} onChange={updateFilters} />
          </ListPageHeader>
        )}

        {/* `forceMount`: both panels stay in the HTML, so the Open source list
            is there for find-in-page and crawlers, and flipping tabs does not
            refetch or re-render the projects timeline. Radix does NOT hide a
            force-mounted panel (its Presence is always "present"), so the
            inactive one is hidden here by its `data-state`. */}
        <TabsContent
          value="projects"
          forceMount
          className="mt-0 space-y-6 data-[state=inactive]:hidden md:space-y-8"
        >
          {showSkeletons ? (
            <ol className="border-l border-border/60">
              {Array.from({ length: 3 }).map((_, i) => (
                <ProjectTimelineItemSkeleton key={i} />
              ))}
            </ol>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <ProjectEmpty isSearch={hasActiveFilters} />
            </div>
          ) : (
            <div
              className={`transition-opacity duration-200 ${
                isPlaceholderData ? 'pointer-events-none opacity-50' : 'opacity-100'
              }`}
            >
              <ProjectsTimeline
                projects={projects}
                onTagClick={toggleTag}
                onTechClick={toggleTech}
              />
            </div>
          )}

          <Pagination
            setPage={setPage}
            pagination={pagination}
            isPlaceholderData={isPlaceholderData}
            pageLabel={tPagination('pageLabel', {
              page: pagination?.currentPage ?? 1,
              totalPages: pagination?.totalPages ?? 1,
            })}
            previousLabel={tPagination('previous')}
            nextLabel={tPagination('next')}
          />
        </TabsContent>

        {openSource && (
          <TabsContent
            value={OPEN_SOURCE_VIEW}
            forceMount
            className="mt-0 data-[state=inactive]:hidden"
          >
            {openSource.list}
          </TabsContent>
        )}
      </Tabs>
    </ProjectsShell>
  );
}
