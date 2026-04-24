'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useTagInfiniteQuery } from '@/entities/tag';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import { useDebounce } from '@/shared/hooks';
import { Button, FilterMultiSelectSection, Input } from '@/shared/ui';

interface FilterValues {
  tagSlugs: string[];
  search: string;
}

interface BlogFiltersProps {
  value: FilterValues;
  onChange: (value: FilterValues) => void;
}

export function BlogFilters({ value, onChange }: BlogFiltersProps) {
  const t = useTranslations('components.blogFilters');

  const [search, setSearch] = useState(value.search);
  const [debounced] = useDebounce(search, 400);

  const {
    data: tagData,
    fetchNextPage: fetchNextTags,
    hasNextPage: hasNextTags,
    isFetchingNextPage: isFetchingTags,
    isLoading: isLoadingTags,
  } = useTagInfiniteQuery(10);

  useEffect(() => {
    onChange({ ...value, search: debounced });
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
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-4 md:p-5">
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
          placeholder={t('searchBlog')}
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

      <FilterMultiSelectSection
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
      </FilterMultiSelectSection>
    </div>
  );
}
