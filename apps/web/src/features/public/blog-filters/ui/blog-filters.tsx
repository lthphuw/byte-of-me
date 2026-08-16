'use client';

import { Button } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useTagInfiniteQuery } from '@/entities/tag/query';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import type { BlogFilterState } from '@/features/public/blog-filters/lib';
import { useUrlSyncedSearch } from '@/shared/hooks/use-url-synced-search';
import type { FilterNavigationOptions } from '@/shared/lib/filter-params';
import { FilterSearchInput } from '@/shared/ui';

interface BlogFiltersProps {
  value: BlogFilterState;
  onChange: (
    value: BlogFilterState,
    options?: FilterNavigationOptions
  ) => void;
}

/**
 * Compact one-row filter bar. It used to be a bordered card that filled the top
 * of the page, so the first thing a visitor saw was a filter form rather than
 * any posts.
 */
export function BlogFilters({ value, onChange }: BlogFiltersProps) {
  const t = useTranslations('components.blogFilters');
  const tShared = useTranslations('components.filters');

  // The URL owns the term: the box re-syncs on back/forward and on an in-app
  // `?q=` link, but ignores the echo of its own debounced write, so keystrokes
  // typed while that write is in flight survive. See `useUrlSyncedSearch`.
  const { search, setSearch, resetSearch } = useUrlSyncedSearch({
    urlSearch: value.search,
    onCommit: (nextSearch, history) =>
      onChange({ ...value, search: nextSearch }, { history }),
  });

  const {
    data: tagData,
    fetchNextPage: fetchNextTags,
    hasNextPage: hasNextTags,
    isFetchingNextPage: isFetchingTags,
  } = useTagInfiniteQuery(10);

  const allTags = tagData?.pages.flatMap((page) => page.data) || [];

  const toggleTag = (slug: string) => {
    const next = value.tagSlugs.includes(slug)
      ? value.tagSlugs.filter((s) => s !== slug)
      : [...value.tagSlugs, slug];

    onChange({ ...value, tagSlugs: next });
  };

  const handleReset = () => {
    resetSearch();
    onChange({ tagSlugs: [], search: '' });
  };

  const hasFilters = value.tagSlugs.length > 0 || search.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <FilterSearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('searchBlog')}
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

      {allTags.length > 0 && (
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
      )}
    </div>
  );
}
