'use client';

import { useEffect, useState } from 'react';
import { Tag } from '@/models/tag';
import { X } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/tag-badge';

interface FilterValues {
  tagSlugs: string[];
  search: string;
}

interface Props {
  tags: Tag[];
  value: FilterValues;
  onChange: (value: FilterValues) => void;
}

export function BlogFilter({ tags, value, onChange }: Props) {
  const [search, setSearch] = useState(value.search);
  const [debounced] = useDebounce(search, 400);

  useEffect(() => {
    onChange({ ...value, search: debounced });
  }, [debounced]);

  const toggleTag = (slug: string) => {
    const next = value.tagSlugs.includes(slug)
      ? value.tagSlugs.filter((s) => s !== slug)
      : [...value.tagSlugs, slug];

    onChange({ ...value, tagSlugs: next });
  };

  const clearAll = () => {
    setSearch('');
    onChange({
      tagSlugs: [],
      search: '',
    });
  };

  const hasFilters = value.tagSlugs.length || value.search;

  return (
    <div className="flex flex-col gap-5 border rounded-xl p-4 md:p-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Input
          placeholder="Search blogs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setSearch('')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* TAGS */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Tags
        </p>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              active={value.tagSlugs.includes(tag.slug)}
              onClick={toggleTag}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
