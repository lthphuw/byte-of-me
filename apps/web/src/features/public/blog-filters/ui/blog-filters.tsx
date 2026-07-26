'use client';

import { useEffect, useState } from 'react';
import { Button, useDebounce } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useTagInfiniteQuery } from '@/entities/tag';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import { FilterSearchInput } from '@/shared/ui';

interface FilterValues {
  tagSlugs: string[];
  search: string;
}

interface BlogFiltersProps {
  value: FilterValues;
  onChange: (value: FilterValues) => void;
}

/**
 * Compact one-row filter bar. It used to be a bordered card that filled the top
 * of the page, so the first thing a visitor saw was a filter form rather than
 * any posts.
 */
export function BlogFilters({ value, onChange }: BlogFiltersProps) {
  const t = useTranslations('components.blogFilters');
  const tShared = useTranslations('components.filters');

  const [search, setSearch] = useState(value.search);
  const [debounced] = useDebounce(search, 400);

  const {
    data: tagData,
    fetchNextPage: fetchNextTags,
    hasNextPage: hasNextTags,
    isFetchingNextPage: isFetchingTags,
  } = useTagInfiniteQuery(10);

  // Only the debounced term should trigger a change. `onChange` and `value` are
  // recreated by the parent on every render, so including them would refire the
  // filter on each keystroke.
  useEffect(() => {
    onChange({ ...value, search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const allTags = tagData?.pages.flatMap((page) => page.data) || [];

  const toggleTag = (slug: string) => {
    const next = value.tagSlugs.includes(slug)
      ? value.tagSlugs.filter((s) => s !== slug)
      : [...value.tagSlugs, slug];

    onChange({ ...value, tagSlugs: next });
  };

  const handleReset = () => {
    setSearch('');
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
            className="h-9 shrink-0 px-3 text-xs text-muted-foreground"
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
