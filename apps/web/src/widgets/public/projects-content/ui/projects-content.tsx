'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { QueryState } from '@byte-of-me/query';
import {
  Pagination,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useHydrated,
} from '@byte-of-me/ui';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Narrow import on purpose: the `@/entities` root barrel pulls unrelated
// server-rendering modules (education-item -> RichText -> tiptap) into the
// public bundle, so a client component imports the slice instead.
import { OPEN_SOURCE_VIEW } from '@/entities/open-source/model/open-source-url';
import { ProjectEmpty, ProjectTimelineItemSkeleton } from '@/entities/project';
import { usePublicProjectList } from '@/entities/project/query';
import {
  ProjectFilters,
  useProjectFilters,
} from '@/features/public/project-filters';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { ListPageHeader } from '@/shared/ui';
import { ProjectsShell } from '@/widgets/public/projects-content/ui/projects-shell';
import { ProjectsTimeline } from '@/widgets/public/projects-content/ui/projects-timeline';

const TAB_PILL =
  'pointer-events-none absolute inset-y-1 left-1 -z-10 w-[calc(50%-0.25rem)] rounded-md bg-background shadow motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-sleek';

// Applied to the panel that has just become active. Only after the first switch:
// on load the active panel is already in the server HTML, and fading it in
// would flash the content the page was meant to paint immediately.
const PANEL_ENTER =
  'data-[state=active]:animate-in data-[state=active]:fade-in-0 motion-safe:data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-300 data-[state=active]:ease-sleek';

interface ProjectsContentProps {
  /**
   * The server-rendered Open source list and its summary; `null` removes the tab.
   * A failed read passes its error as `list` with no summary, so the tab stays.
   * Handed in as a node so none of that markup becomes client JavaScript.
   */
  openSource?: { list: ReactNode; summary?: string } | null;
}

export function ProjectsContent({ openSource }: ProjectsContentProps) {
  const t = useTranslations('project');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // The URL is the source of truth, like the filters: a shared link opens on
  // the right tab and back/forward move between them.
  const urlView =
    openSource && searchParams.get('view') === OPEN_SOURCE_VIEW
      ? OPEN_SOURCE_VIEW
      : 'projects';
  // Static HTML is built without query params and shows the Projects tab; reading `?view=` in the
  // first render breaks hydration (React #418), so the URL view applies once hydrated.
  const hydrated = useHydrated();
  const view = hydrated ? urlView : 'projects';
  const isOpenSourceView = view === OPEN_SOURCE_VIEW;
  // Always an explicit `?view=`, even for the default tab: the Next router silently drops
  // `router.replace('/en/projects')` from `?view=open-source` (verified on a production build;
  // URL and tab stay put), so the Projects tab would never switch.
  const setView = (next: string) =>
    router.replace(`${pathname}?view=${next}`, { scroll: false });
  // Flips in the same render as the view, not on the click (the URL lags it). A panel takes the
  // entrance only while current: Radix flips `data-state` a commit after `view`, so the panel being
  // left would replay it. Compares the URL view, so a deep link does not replay the entrance.
  const [lastView, setLastView] = useState(urlView);
  const [hasSwitched, setHasSwitched] = useState(false);
  if (urlView !== lastView) {
    setLastView(urlView);
    setHasSwitched(true);
  }
  const tPagination = useTranslations('components.pagination');
  const { filters, page, updateFilters, setPage } = useProjectFilters();
  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.tagSlugs.length > 0 ||
    filters.techStackSlugs.length > 0;

  const { data, isLoading, isError, isPlaceholderData, refetch } =
    usePublicProjectList(page, filters);

  const projects = data?.data ?? [];
  const pagination = data?.meta ?? {
    currentPage: 1,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  };

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

  // Two equal columns so the active pill slides one column by CSS transform: no measuring, no
  // `layout` animation (the lazy feature set lacks it), and the pill is in the server HTML.
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
        className="flex flex-col gap-6"
      >
        {/* No `description`, same as Blogs: the strapline restated the page title
            in more words. The count is the subtitle. */}
        {/* One header for both views, so the TabsList is the same element across
            a switch and its pill can transition instead of remounting. */}
        <ListPageHeader
          className="md:gap-4"
          title={isOpenSourceView ? t('tabOpenSource') : t('pageTitle')}
          count={
            isOpenSourceView && openSource
              ? openSource.summary
              : data
                ? t('count', { count: pagination.totalCount })
                : undefined
          }
        >
          {tabs}
          {!isOpenSourceView && (
            <ProjectFilters value={filters} onChange={updateFilters} />
          )}
        </ListPageHeader>

        {/* `forceMount`: both panels stay in the HTML for find-in-page and crawlers, and tab
            flips refetch nothing. Radix does NOT hide a force-mounted panel (its Presence is
            always "present"), so the inactive one is hidden here by `data-state`. */}
        <TabsContent
          value="projects"
          forceMount
          className={cn(
            'mt-0 space-y-6 data-[state=inactive]:hidden',
            hasSwitched && !isOpenSourceView && PANEL_ENTER
          )}
        >
          {/* `isLoading`, not `isFetching`: a refetch keeps the list on screen, and only the first
              load of a result set shows skeletons. `isEmpty` is false because ProjectEmpty
              (with its icon) is the empty state here. */}
          <QueryState
            isLoading={isLoading}
            isError={isError}
            isEmpty={false}
            onRetry={() => void refetch()}
            skeleton={
              <ol className="border-l border-border/60">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ProjectTimelineItemSkeleton key={i} />
                ))}
              </ol>
            }
            errorTitle={t('loadErrorTitle')}
            errorDescription={t('loadErrorDescription')}
            retryLabel={t('retry')}
            emptyTitle=""
          >
            {projects.length === 0 ? (
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
          </QueryState>

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
