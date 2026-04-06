'use client';

import { useState } from 'react';
import { Project } from '@/models/project';
import { Tag } from '@/models/tag';
import { TechStack } from '@/models/tech-stack';
import { useQuery } from '@tanstack/react-query';

import { PaginatedData } from '@/types/api/paginated.type';
import { getPaginatedPublicProjects } from '@/lib/actions/public/get-public-projects';
import { EmptyProject } from '@/components/empty-project';
import Loading from '@/components/loading';
import { Pagination } from '@/components/pagination';
import { ProjectCard } from '@/components/project-card';
import { ProjectFilter } from '@/components/project-filter';

interface ProjectsContentProps {
  initProjects: PaginatedData<Project>;
  tags: Tag[];
  techStacks: TechStack[];
}

export function ProjectsContent({
  initProjects,
  techStacks,
  tags,
}: ProjectsContentProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    tagSlugs: [] as string[],
    techStackSlugs: [] as string[],
    search: '',
  });

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['public-projects', page, filters],
    queryFn: () => getPaginatedPublicProjects({ ...filters, page, limit: 9 }),
    placeholderData: (previousData) => previousData,
    initialData: {
      success: true,
      data: initProjects,
    },
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
    <div className="container px-0 py-8 md:px-6 flex flex-col gap-6 md:gap-8">
      <ProjectFilter
        tags={tags}
        techStacks={techStacks}
        value={filters}
        onChange={(next) => {
          setPage(1);
          setFilters(next);
        }}
      />

      {/* PROJECT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center py-10">
            <Loading />
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full flex justify-center items-center py-10">
            <EmptyProject message="No projects match your filters" />
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onTagClick={(slug) => toggleTag(slug)}
              onTechClick={(slug) => toggleTech(slug)}
            />
          ))
        )}
      </div>

      {/* PAGINATION */}
      <Pagination
        setPage={setPage}
        pagination={pagination}
        isPlaceholderData={isPlaceholderData}
      />
    </div>
  );
}
