'use client';

import { useEffect, useState } from 'react';
import { useTagInfiniteQuery } from '@/entities/tag';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';

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
    <div className="bg-card flex flex-col gap-5 rounded-xl border p-4 md:p-5">
      <div className="flex h-8 items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">{t('filters')}</h2>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground h-8 px-2 text-xs"
          >
            {t('reset')}
          </Button>
        )}
      </div>

      <div className="relative">
        <Input
          placeholder="Search blogs..."
          className="h-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-transparent"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
          Tags
        </p>

        <div className="flex min-h-[32px] flex-wrap items-center gap-1.5">
          {isLoadingTags && !isFetchingTags ? (
            <>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </>
          ) : (
            <>
              {allTags.map((tag) => (
                <TagClickableBadge
                  key={tag.id}
                  tag={tag}
                  active={value.tagSlugs.includes(tag.slug)}
                  onClick={() => toggleTag(tag.slug)}
                />
              ))}

              {isFetchingTags && (
                <>
                  <Skeleton className="h-6 w-14 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </>
              )}

              {hasNextTags && !isFetchingTags && (
                <button
                  type="button"
                  onClick={() => fetchNextTags()}
                  className="text-primary inline-flex h-6 items-center gap-1 px-2 text-[11px] font-medium transition-all hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  {t('seeMore')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
