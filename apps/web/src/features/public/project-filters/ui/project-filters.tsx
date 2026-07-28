'use client';

import { useEffect, useState } from 'react';
import { Button, useDebounce } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TagClickableBadge } from '@/entities/tag';
import { useTagInfiniteQuery } from '@/entities/tag/query';
import { TechStackClickableBadge } from '@/entities/tech-stack';
import { useTechStackInfiniteQuery } from '@/entities/tech-stack/query';
import { FilterSearchInput } from '@/shared/ui';

export interface FilterValues {
  tagSlugs: string[];
  techStackSlugs: string[];
  search: string;
}

export interface ProjectFiltersProps {
  value: FilterValues;
  onChange: (value: FilterValues) => void;
}

/**
 * Compact filter bar: search on one row, then a row of tags and a row of tech
 * stacks. Same shape as the blog filters, with the extra facet projects have.
 */
export function ProjectFilters({ value, onChange }: ProjectFiltersProps) {
  const t = useTranslations('components.projectFilters');
  const tShared = useTranslations('components.filters');

  const [search, setSearch] = useState(value.search);
  const [debounced] = useDebounce(search, 400);

  // Only the debounced term should trigger a change — see BlogFilters.
  useEffect(() => {
    onChange({ ...value, search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const {
    data: tagData,
    fetchNextPage: fetchNextTags,
    hasNextPage: hasNextTags,
    isFetchingNextPage: isFetchingTags,
  } = useTagInfiniteQuery(8);

  const {
    data: techData,
    fetchNextPage: fetchNextTech,
    hasNextPage: hasNextTech,
    isFetchingNextPage: isFetchingTech,
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <FilterSearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('searchProject')}
          clearLabel={tShared('clearSearch')}
          className="w-full sm:max-w-xs"
        />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-9 shrink-0 px-3 text-xs text-muted-foreground"
          >
            {t('reset')}
          </Button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="space-y-1.5 sm:flex sm:items-start sm:gap-x-2 sm:space-y-0">
          <span className="block pt-1 meta-label sm:w-20 sm:shrink-0">{t('tags')}</span>

          <div className="flex flex-wrap items-center gap-1.5">

            {allTags.map((tag) => (
              <TagClickableBadge
                key={tag.id}
                tag={tag}
                active={value.tagSlugs.includes(tag.slug)}
                onClick={toggleTag}
              />
            ))}

            {hasNextTags && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isFetchingTags}
                onClick={() => fetchNextTags()}
                className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
              >
                <Plus className="size-3" />
                {t('seeMore')}
              </Button>
            )}
          </div>
        </div>
      )}

      {allTechStacks.length > 0 && (
        <div className="space-y-1.5 sm:flex sm:items-start sm:gap-x-2 sm:space-y-0">
          <span className="block pt-1 meta-label sm:w-20 sm:shrink-0">{t('techStack')}</span>

          <div className="flex flex-wrap items-center gap-1.5">

            {allTechStacks.map((tech) => (
              <TechStackClickableBadge
                key={tech.id}
                tech={tech}
                active={value.techStackSlugs.includes(tech.slug)}
                onClick={toggleTech}
              />
            ))}

            {hasNextTech && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isFetchingTech}
                onClick={() => fetchNextTech()}
                className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
              >
                <Plus className="size-3" />
                {t('seeMore')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
