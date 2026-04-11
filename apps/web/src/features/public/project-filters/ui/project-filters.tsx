'use client';

import { useEffect, useState } from 'react';
import { TagClickableBadge, useTagInfiniteQuery } from '@/entities/tag';
import {
  TechStackClickableBadge,
  useTechStackInfiniteQuery,
} from '@/entities/tech-stack';
import { ProjectFilterSection } from '@/features/public/project-filters/ui/project-filter-section';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { X } from 'lucide-react';
import { useDebounce } from 'use-debounce';

export interface FilterValues {
  tagSlugs: string[];
  techStackSlugs: string[];
  search: string;
}

export interface ProjectFiltersProps {
  value: FilterValues;
  onChange: (value: FilterValues) => void;
}

export function ProjectFilters({ value, onChange }: ProjectFiltersProps) {
  const [search, setSearch] = useState(value.search);
  const [debounced] = useDebounce(search, 400);

  useEffect(() => {
    onChange({ ...value, search: debounced });
  }, [debounced]);

  // Infinite Queries
  const {
    data: tagData,
    fetchNextPage: fetchNextTags,
    hasNextPage: hasNextTags,
    isFetchingNextPage: isFetchingTags,
    isLoading: isLoadingTags,
  } = useTagInfiniteQuery(8);

  const {
    data: techData,
    fetchNextPage: fetchNextTech,
    hasNextPage: hasNextTech,
    isFetchingNextPage: isFetchingTech,
    isLoading: isLoadingTech,
  } = useTechStackInfiniteQuery(8);

  const allTags = tagData?.pages.flatMap((page) => page.data) || [];
  const allTechStacks = techData?.pages.flatMap((page) => page.data) || [];

  const toggleTag = (slug: string) => {
    const next = value.tagSlugs.includes(slug)
      ? value.tagSlugs.filter((s) => s !== slug)
      : [...value.tagSlugs, slug];
    onChange({ ...value, tagSlugs: next });
  };

  const toggleTech = (slug: string) => {
    const next = value.techStackSlugs.includes(slug)
      ? value.techStackSlugs.filter((s) => s !== slug)
      : [...value.techStackSlugs, slug];
    onChange({ ...value, techStackSlugs: next });
  };

  const hasFilters =
    value.tagSlugs.length || value.techStackSlugs.length || value.search;

  return (
    <div className="flex flex-col gap-6 border rounded-xl p-4 md:p-5 bg-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">Filters</h2>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() =>
              onChange({ tagSlugs: [], techStackSlugs: [], search: '' })
            }
            className="h-8 px-2 text-xs text-muted-foreground"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="relative">
        <Input
          placeholder="Search projects..."
          className="h-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <X
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer text-muted-foreground"
            onClick={() => setSearch('')}
          />
        )}
      </div>

      {/* TAGS SECTION */}
      <ProjectFilterSection
        title="Tags"
        onLoadMore={() => fetchNextTags()}
        hasMore={hasNextTags}
        isLoading={isLoadingTags}
        isFetchingNextPage={isFetchingTags}
      >
        {allTags.map((tag) => (
          <TagClickableBadge
            key={tag.id}
            tag={tag}
            active={value.tagSlugs.includes(tag.slug)}
            onClick={(slug) => toggleTag(slug)}
          />
        ))}
      </ProjectFilterSection>

      {/* TECH STACK SECTION */}
      <ProjectFilterSection
        title="Tech Stack"
        onLoadMore={() => fetchNextTech()}
        hasMore={hasNextTech}
        isLoading={isLoadingTech}
        isFetchingNextPage={isFetchingTech}
      >
        {allTechStacks.map((tech) => (
          <TechStackClickableBadge
            key={tech.id}
            tech={tech}
            active={value.techStackSlugs.includes(tech.slug)}
            onClick={(slug) => toggleTech(slug)}
          />
        ))}
      </ProjectFilterSection>
    </div>
  );
}
