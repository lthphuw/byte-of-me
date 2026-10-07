'use client';

import { type ReactNode, useEffect, useState } from 'react';
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
import { HYDRATED_LIST_BEHAVIOR } from '@/shared/hooks/use-infinite-list-query';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { ListPageHeader } from '@/shared/ui';
import { ProjectsShell } from '@/widgets/public/projects-content/ui/projects-shell';
import { ProjectsTimeline } from '@/widgets/public/projects-content/ui/projects-timeline';

const OPEN_SOURCE_VIEW = 'open-source';

const TAB_PILL =
  'pointer-events-none absolute inset-y-1 left-1 -z-10 w-[calc(50%-0.25rem)] rounded-md bg-background shadow motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-sleek';

// Applied to the panel that has just become active. Only after the first switch:
// on load the active panel is already in the server HTML, and fading it in
// would flash the content the page was meant to paint immediately.
const PANEL_ENTER =
  'data-[state=active]:animate-in data-[state=active]:fade-in-0 motion-safe:data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-300 data-[state=active]:ease-sleek';

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
  const isOpenSourceView = view === OPEN_SOURCE_VIEW;
  // Always an explicit `?view=`, even for the default tab. Navigating back to
  // the bare pathname from `?view=open-source` is silently dropped by the Next
  // router (verified on a production build: `router.replace('/en/projects')`
  // leaves the URL and the tab untouched, while any URL with a query works), so
  // the Projects tab would never switch.
  const setView = (next: string) =>
    router.replace(`${pathname}?view=${next}`, { scroll: false });
  // Flips in the same render as the view, not on the click: the URL (and so
  // `view`) lags the click. Each panel also takes the entrance only while it is
  // the current view — Radix flips `data-state` a commit after `view` does, so
  // an unconditional class made the panel being left replay it before hiding.
  const [lastView, setLastView] = useState(view);
  const [hasSwitched, setHasSwitched] = useState(false);
  if (view !== lastView) {
    setLastView(view);
    setHasSwitched(true);
  }
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
    // Same as the blogs list: never refetch the hydrated page on mount.
    ...HYDRATED_LIST_BEHAVIOR,
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

  // The timeline entrance belongs to the first result set of this mount. Held
  // here, not in the timeline: that unmounts on an empty result and would
  // replay it when the list comes back.
  const hasResults = projects.length > 0;
  const [hasShownResults, setHasShownResults] = useState(false);
  useEffect(() => {
    if (hasResults) setHasShownResults(true);
  }, [hasResults]);

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

  // Two equal columns so the active pill can slide by exactly one column with a
  // CSS transform: no measuring, no `layout` animation (the lazy feature set
  // does not ship it), and the server HTML already has the pill in place.
  // The triggers drop their own active background so only the pill paints it.
  const tabs = openSource && (
    <TabsList className="relative isolate inline-grid grid-cols-2 self-start">
      <span
        aria-hidden
        className={cn(
          TAB_PILL,
          isOpenSourceView ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      <TabsTrigger
        value="projects"
        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
      >
        {t('tabProjects')}
      </TabsTrigger>
      <TabsTrigger
        value={OPEN_SOURCE_VIEW}
        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
      >
        {t('tabOpenSource')}
      </TabsTrigger>
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
        {/* One header for both views, so the TabsList is the same element across
            a switch and its pill can transition instead of remounting. */}
        <ListPageHeader
          title={isOpenSourceView ? t('tabOpenSource') : t('pageTitle')}
          count={
            isOpenSourceView && openSource
              ? openSource.summary
              : t('count', { count: pagination.totalCount })
          }
        >
          {tabs}
          {!isOpenSourceView && (
            <ProjectFilters value={filters} onChange={updateFilters} />
          )}
        </ListPageHeader>

        {/* `forceMount`: both panels stay in the HTML, so the Open source list
            is there for find-in-page and crawlers, and flipping tabs does not
            refetch or re-render the projects timeline. Radix does NOT hide a
            force-mounted panel (its Presence is always "present"), so the
            inactive one is hidden here by its `data-state`. */}
        <TabsContent
          value="projects"
          forceMount
          className={cn(
            'mt-0 space-y-6 data-[state=inactive]:hidden md:space-y-8',
            hasSwitched && !isOpenSourceView && PANEL_ENTER
          )}
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
                isPlaceholderData
                  ? 'pointer-events-none opacity-50'
                  : 'opacity-100'
              }`}
            >
              <ProjectsTimeline
                projects={projects}
                playEntrance={!hasShownResults}
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
            className={cn(
              'mt-0 data-[state=inactive]:hidden',
              hasSwitched && isOpenSourceView && PANEL_ENTER
            )}
          >
            {openSource.list}
          </TabsContent>
        )}
      </Tabs>
    </ProjectsShell>
  );
}
