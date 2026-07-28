'use client';

import { useState } from 'react';
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
import { ProjectFilters } from '@/features/public';
import { ListPageHeader } from '@/shared/ui';
import { ProjectsShell } from '@/widgets/public/projects-content/ui/projects-shell';
import { ProjectsTimeline } from '@/widgets/public/projects-content/ui/projects-timeline';

export function ProjectsContent() {
  const t = useTranslations('project');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    tagSlugs: [] as string[],
    techStackSlugs: [] as string[],
    search: '',
  });
  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.tagSlugs.length > 0 ||
    filters.techStackSlugs.length > 0;

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
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

  const showSkeletons = isLoading || (isFetching && !isPlaceholderData);

  const toggleTag = (slug: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      tagSlugs: prev.tagSlugs.includes(slug)
        ? prev.tagSlugs.filter((s) => s !== slug)
        : [...prev.tagSlugs, slug],
    }));
  };

  const toggleTech = (slug: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      techStackSlugs: prev.techStackSlugs.includes(slug)
        ? prev.techStackSlugs.filter((s) => s !== slug)
        : [...prev.techStackSlugs, slug],
    }));
  };

  return (
    <ProjectsShell>
      <ListPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        count={t('count', { count: pagination.totalCount })}
      >
        <ProjectFilters
          value={filters}
          onChange={(next) => {
            setPage(1);
            setFilters(next);
          }}
        />
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
      />
    </ProjectsShell>
  );
}
