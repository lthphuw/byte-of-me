'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';

import { TagClickableBadge, useTagInfiniteQuery } from '@/entities/tag';
import {
  TechStackClickableBadge,
  useTechStackInfiniteQuery,
} from '@/entities/tech-stack';
import { ProjectFilterSection } from '@/features/public';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

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
  const t = useTranslations('components.projectFilters');

  const [search, setSearch] = useState(value.search);
  const [debounced] = useDebounce(search, 400);

  useEffect(() => {
    onChange({ ...value, search: debounced });
  }, [debounced]);

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

  const handleReset = () => {
    setSearch('');
    onChange({ tagSlugs: [], techStackSlugs: [], search: '' });
  };

  const hasFilters =
    value.tagSlugs.length > 0 ||
    value.techStackSlugs.length > 0 ||
    search.length > 0;

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-4 md:p-5">
      <div className="flex h-8 items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">{t('filters')}</h2>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2 text-xs text-muted-foreground"
          >
            {t('reset')}
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
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:bg-transparent"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <ProjectFilterSection
        title="Tags"
        onLoadMore={() => fetchNextTags()}
        hasMore={hasNextTags}
        isLoading={isLoadingTags}
        isFetchingNextPage={isFetchingTags}
      >
        <div className="flex min-h-[32px] flex-wrap items-center gap-1.5">
          {allTags.map((tag) => (
            <TagClickableBadge
              key={tag.id}
              tag={tag}
              active={value.tagSlugs.includes(tag.slug)}
              onClick={(slug) => toggleTag(slug)}
            />
          ))}
        </div>
      </ProjectFilterSection>

      <ProjectFilterSection
        title="Tech Stack"
        onLoadMore={() => fetchNextTech()}
        hasMore={hasNextTech}
        isLoading={isLoadingTech}
        isFetchingNextPage={isFetchingTech}
      >
        <div className="flex min-h-[32px] flex-wrap items-center gap-1.5">
          {allTechStacks.map((tech) => (
            <TechStackClickableBadge
              key={tech.id}
              tech={tech}
              active={value.techStackSlugs.includes(tech.slug)}
              onClick={(slug) => toggleTech(slug)}
            />
          ))}
        </div>
      </ProjectFilterSection>
    </div>
  );
}
