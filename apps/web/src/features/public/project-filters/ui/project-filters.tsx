'use client';

import type { ReactNode } from 'react';
import type { FilterNavigationOptions } from '@byte-of-me/api-core';
import { HYDRATED_LIST_BEHAVIOR, useUrlSyncedSearch } from '@byte-of-me/query';
import { Button, Skeleton } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TagClickableBadge } from '@/entities/tag';
import { useTagInfiniteQuery } from '@/entities/tag/query';
import { TechStackClickableBadge } from '@/entities/tech-stack';
import { useTechStackInfiniteQuery } from '@/entities/tech-stack/query';
import {
  PROJECT_FILTER_FACET_LIMIT,
  type ProjectFilterState,
} from '@/features/public/project-filters/lib';
import { FilterSearchInput } from '@/shared/ui';

interface ProjectFiltersProps {
  value: ProjectFilterState;
  onChange: (
    value: ProjectFilterState,
    options?: FilterNavigationOptions
  ) => void;
}

/**
 * Compact filter bar: search on one row, then a row of tags and a row of tech
 * stacks. Same shape as the blog filters, with the extra facet projects have.
 */
export function ProjectFilters({ value, onChange }: ProjectFiltersProps) {
  const t = useTranslations('components.projectFilters');
  const tShared = useTranslations('components.filters');

  // Debounced write out, re-sync in on back/forward, echo of our own write
  // ignored so it cannot eat a keystroke — see `useUrlSyncedSearch`.
  const { search, setSearch, resetSearch } = useUrlSyncedSearch({
    urlSearch: value.search,
    onCommit: (nextSearch, history) =>
      onChange({ ...value, search: nextSearch }, { history }),
  });

  // Both rows are prefetched in projects/page.tsx; the hydrated entries are
  // build-old, so without `HYDRATED_LIST_BEHAVIOR` each refetches on mount.
  const tagRead = useTagInfiniteQuery(
    PROJECT_FILTER_FACET_LIMIT,
    HYDRATED_LIST_BEHAVIOR
  );
  const techRead = useTechStackInfiniteQuery(
    PROJECT_FILTER_FACET_LIMIT,
    HYDRATED_LIST_BEHAVIOR
  );

  const allTags = tagRead.data?.pages.flatMap((page) => page.data) || [];
  const allTechStacks = techRead.data?.pages.flatMap((page) => page.data) || [];

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
    resetSearch();
    onChange({ tagSlugs: [], techStackSlugs: [], search: '' });
  };

  const hasFilters =
    value.tagSlugs.length > 0 ||
    value.techStackSlugs.length > 0 ||
    search.length > 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
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
            className="h-11 shrink-0 px-3 text-xs text-muted-foreground md:h-9"
          >
            {t('reset')}
          </Button>
        )}
      </div>

      <FacetRow
        label={t('tags')}
        isLoading={tagRead.isLoading}
        isError={tagRead.isError}
        isEmpty={allTags.length === 0}
        onRetry={() => void tagRead.refetch()}
      >
        {allTags.map((tag) => (
          <TagClickableBadge
            key={tag.id}
            tag={tag}
            active={value.tagSlugs.includes(tag.slug)}
            onClick={toggleTag}
          />
        ))}

        {tagRead.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            disabled={tagRead.isFetchingNextPage}
            onClick={() => tagRead.fetchNextPage()}
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
          >
            <Plus className="size-3" />
            {t('seeMore')}
          </Button>
        )}
      </FacetRow>

      <FacetRow
        label={t('techStack')}
        isLoading={techRead.isLoading}
        isError={techRead.isError}
        isEmpty={allTechStacks.length === 0}
        onRetry={() => void techRead.refetch()}
      >
        {allTechStacks.map((tech) => (
          <TechStackClickableBadge
            key={tech.id}
            tech={tech}
            active={value.techStackSlugs.includes(tech.slug)}
            onClick={toggleTech}
          />
        ))}

        {techRead.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            disabled={techRead.isFetchingNextPage}
            onClick={() => techRead.fetchNextPage()}
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
          >
            <Plus className="size-3" />
            {t('seeMore')}
          </Button>
        )}
      </FacetRow>
    </div>
  );
}

interface FacetRowProps {
  label: string;
  isLoading: boolean;
  isError: boolean;
  /** No chips are loaded. A row with nothing to offer is hidden, not shown empty. */
  isEmpty: boolean;
  onRetry: () => void;
  children: ReactNode;
}

/**
 * One labelled chip row. While it loads it shows chip-shaped placeholders; when
 * it fails with nothing loaded it offers Retry. A failed background refetch
 * keeps the chips already on screen.
 */
function FacetRow({
  label,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  children,
}: FacetRowProps) {
  const t = useTranslations('components.projectFilters');

  let body: ReactNode = children;
  if (isLoading) {
    body = <FacetChipsSkeleton />;
  } else if (isError && isEmpty) {
    body = (
      <>
        <p className="text-xs text-muted-foreground">{t('loadError')}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
        >
          {t('retry')}
        </Button>
      </>
    );
  } else if (isEmpty) {
    return null;
  }

  return (
    <div className="space-y-2 sm:flex sm:items-start sm:gap-x-2 sm:space-y-0">
      <span className="block pt-1 meta-label sm:w-20 sm:shrink-0">{label}</span>

      <div
        className="flex flex-wrap items-center gap-2"
        aria-hidden={isLoading || undefined}
      >
        {body}
      </div>
    </div>
  );
}

/** Four chip-shaped placeholders of mixed width, the same height as a filter chip. */
function FacetChipsSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-24 rounded-full" />
    </>
  );
}
