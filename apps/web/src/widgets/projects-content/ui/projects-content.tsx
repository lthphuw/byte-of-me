'use client';

import { useState } from 'react';
import { getPaginatedPublicProjects } from '@/entities/project/api/get-paginated-public-projects';
import { PublicProject } from '@/entities/project/model/types';
import {
  ProjectCard,
  ProjectCardSkeleton,
  ProjectEmpty,
} from '@/entities/project/ui';
import { ProjectFilters } from '@/features/public/project-filters/ui/project-filters';
import { PaginatedData } from '@/shared/types/api/paginated-api.type';
import { Pagination } from '@/shared/ui/pagination';
import { ProjectsShell } from '@/widgets/projects-content/ui/projects-shell';
import { useQuery } from '@tanstack/react-query';

interface ProjectsContentProps {
  initProjects?: PaginatedData<PublicProject>;
}

export function ProjectsContent({
  initProjects,
}: ProjectsContentProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    tagSlugs: [] as string[],
    techStackSlugs: [] as string[],
    search: '',
  });

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['projects', page, filters],
    queryFn: () => getPaginatedPublicProjects({ ...filters, page, limit: 8 }),
    placeholderData: (previousData) => previousData,
    initialData: initProjects
      ? {
          success: true,
          data: initProjects,
        }
      : undefined,
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
      <div className="container px-0 py-8 md:px-6 flex flex-col gap-6 md:gap-8">
        <ProjectFilters
          value={filters}
          onChange={(next) => {
            setPage(1);
            setFilters(next);
          }}
        />

        {/* PROJECT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {isLoading || (isFetching && !isPlaceholderData)? (
            Array.from({ length: 3 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))
          ) : projects.length === 0 ? (
            <div className="col-span-full flex justify-center items-center py-10">
              <ProjectEmpty message="No projects match your filters" />
            </div>
          ) : (
            <div
              className={`contents transition-opacity duration-200 ${
                isPlaceholderData ? 'opacity-50 pointer-events-none' : 'opacity-100'
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
