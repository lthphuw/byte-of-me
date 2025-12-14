'use client';

import { BaseSelectItem } from '@/types';
import { Filter, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface CategoryFilterProps {
  techstacks: BaseSelectItem[];
  tags: BaseSelectItem[];
  selectedTags: string[];
  selectedTechstacks: string[];
  setSelectedTags: (tags: string[]) => void;
  setSelectedTechstacks: (techs: string[]) => void;
}

export function CategoryFilter({
                                 techstacks,
                                 tags,
                                 selectedTags,
                                 selectedTechstacks,
                                 setSelectedTags,
                                 setSelectedTechstacks,
                               }: CategoryFilterProps) {
  const toggle = (
    value: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => {
    setter(
      list.includes(value)
        ? list.filter((i) => i !== value)
        : [...list, value],
    );
  };

  const clearAll = () => {
    setSelectedTags([]);
    setSelectedTechstacks([]);
  };

  const totalSelected =
    selectedTags.length + selectedTechstacks.length;

  return (
    <div className="mt-4 space-y-3">
      <div className="min-h-[32px] flex flex-wrap gap-2 items-stretch">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {totalSelected > 0 && (
                <span className="text-muted-foreground">
                  ({totalSelected})
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-80 p-4"
          >
            <div className="space-y-4">
              <FilterGroup
                title="Tech stack"
                items={techstacks}
                selected={selectedTechstacks}
                onToggle={(id) =>
                  toggle(
                    id,
                    selectedTechstacks,
                    setSelectedTechstacks,
                  )
                }
              />

              <Separator />

              <FilterGroup
                title="Tags"
                items={tags}
                selected={selectedTags}
                onToggle={(id) =>
                  toggle(id, selectedTags, setSelectedTags)
                }
              />

              {totalSelected > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={clearAll}
                >
                  Clear all
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {selectedTechstacks.map((id) => {
          const item = techstacks.find((t) => t.id === id);
          if (!item) return null;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {item.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  setSelectedTechstacks(
                    selectedTechstacks.filter((i) => i !== id),
                  )
                }
              />
            </Badge>
          );
        })}
        {selectedTags.map((id) => {
          const item = tags.find((t) => t.id === id);
          if (!item) return null;
          return (
            <Badge
              key={id}
              variant="outline"
              className="flex items-center gap-1"
            >
              {item.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  setSelectedTags(
                    selectedTags.filter((i) => i !== id),
                  )
                }
              />
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function FilterGroup({
                       title,
                       items,
                       selected,
                       onToggle,
                     }: {
  title: string;
  items: BaseSelectItem[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(item.id)}
              onCheckedChange={() => onToggle(item.id)}
            />
            <span className="truncate">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
