'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  getPaginatedPublicProjects,
  ProjectCard,
  ProjectCardSkeleton,
  ProjectEmpty,
} from '@/entities';
import { ProjectFilters } from '@/features/public';
import { Pagination } from '@/shared/ui/pagination';
import { ProjectsShell } from '@/widgets/public/projects-content/ui/projects-shell';

export function ProjectsContent() {
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
    queryKey: ['projects', page, filters],
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
      <div className="container flex flex-col gap-6 px-0 py-8 md:gap-8 md:px-6">
        <ProjectFilters
          value={filters}
          onChange={(next) => {
            setPage(1);
            setFilters(next);
          }}
        />

        {/* PROJECT GRID */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {isLoading || (isFetching && !isPlaceholderData) ? (
            Array.from({ length: 3 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))
          ) : projects.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-10">
              <ProjectEmpty isSearch={hasActiveFilters} />
            </div>
          ) : (
            <div
              className={`contents transition-opacity duration-200 ${
                isPlaceholderData
                  ? 'pointer-events-none opacity-50'
                  : 'opacity-100'
              }`}
            >
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onTagClick={(slug) => toggleTag(slug)}
                  onTechClick={(slug) => toggleTech(slug)}
                />
              ))}
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <Pagination
          setPage={setPage}
          pagination={pagination}
          isPlaceholderData={isPlaceholderData}
        />
      </div>
    </ProjectsShell>
  );
}
