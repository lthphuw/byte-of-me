'use client';

import { Pagination } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
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
import { ProjectFilters, useProjectFilters } from '@/features/public';
import { ListPageHeader } from '@/shared/ui';
import { ProjectsShell } from '@/widgets/public/projects-content/ui/projects-shell';
import { ProjectsTimeline } from '@/widgets/public/projects-content/ui/projects-timeline';

export function ProjectsContent() {
  const t = useTranslations('project');
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
  });

  const projects = data?.data?.data || [];
  const pagination = data?.data?.meta || {
    currentPage: 1,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  };

  // Same reasoning as the blogs list: the server-prefetched entry hydrates with
  // the build timestamp, so it is stale on arrival and refetches on mount.
  // Gating on `isFetching` hid the already-rendered list behind skeletons.
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

  return (
    <ProjectsShell>
      {/* No `description`, same as Blogs: the strapline restated the page title
          in more words. The count is the subtitle. */}
      <ListPageHeader
        title={t('pageTitle')}
        count={t('count', { count: pagination.totalCount })}
      >
        <ProjectFilters value={filters} onChange={updateFilters} />
      </ListPageHeader>

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
    </ProjectsShell>
  );
}
