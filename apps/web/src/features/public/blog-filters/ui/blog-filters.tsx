'use client';

import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { useTagInfiniteQuery } from '@/entities/tag';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

interface FilterValues {
  tagSlugs: string[];
  search: string;
}

interface BlogFiltersProps {
  value: FilterValues;
  onChange: (value: FilterValues) => void;
}

export function BlogFilters({ value, onChange }: BlogFiltersProps) {
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

  // Flatten the infinite query data
  const allTags = tagData?.pages.flatMap((page) => page.data) || [];

  const toggleTag = (slug: string) => {
    const next = value.tagSlugs.includes(slug)
      ? value.tagSlugs.filter((s) => s !== slug)
      : [...value.tagSlugs, slug];

    onChange({ ...value, tagSlugs: next });
  };

  const hasFilters = value.tagSlugs.length || value.search;

  return (
    <div className="bg-card flex flex-col gap-5 rounded-xl border p-4 md:p-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">Filters</h2>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ tagSlugs: [], search: '' })}
            className="text-muted-foreground h-8 px-2 text-xs"
          >
            Reset
          </Button>
        )}
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Input
          placeholder="Search blogs..."
          className="h-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <X
            size={14}
            className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            onClick={() => setSearch('')}
          />
        )}
      </div>

      {/* TAGS SECTION */}
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
          Tags
        </p>

        <div className="flex flex-wrap gap-1.5">
          {isLoadingTags && !isFetchingTags ? (
            // Initial Skeletons
            <>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </>
          ) : (
            allTags.map((tag) => (
              <TagClickableBadge
                key={tag.id}
                tag={tag}
                active={value.tagSlugs.includes(tag.slug)}
                onClick={() => toggleTag(tag.slug)}
              />
            ))
          )}

          {/* Paginated Loading State */}
          {isFetchingTags && (
            <>
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </>
          )}

          {/* Load More Button */}
          {hasNextTags && !isFetchingTags && !isLoadingTags && (
            <button
              onClick={() => fetchNextTags()}
              className="text-primary inline-flex h-6 items-center gap-1 px-2 text-[11px] font-medium transition-all hover:underline"
            >
              <Plus className="h-3 w-3" />
              See more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
