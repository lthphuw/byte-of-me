'use client';

import { BaseSelectItem } from '@/types';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { FilterSelect } from './filter-select';

interface CategoryFilterProps {
  techstacks: BaseSelectItem[];
  tags: BaseSelectItem[];
  setSelectedTag: (tag: string) => void;
  setSelectedTechstack: (techstack: string) => void;
  selectedTag?: string;
  selectedTechstack?: string;
}

export function CategoryFilter({
  tags,
  techstacks,
  setSelectedTag,
  setSelectedTechstack,
  selectedTag,
  selectedTechstack,
}: CategoryFilterProps) {
  return (
    <div className="mb-4">
      {/* Mobile: Dropdown */}
      <div className="md:hidden flex gap-3">
        <FilterSelect
          items={techstacks}
          selectedId={selectedTechstack || ''}
          onSelect={setSelectedTechstack}
        />

        <FilterSelect
          items={tags}
          selectedId={selectedTag || ''}
          onSelect={setSelectedTag}
        />
      </div>

      {/* Desktop: Buttons */}
      <div className="hidden md:flex md:gap-2 items-start">
        <div className="flex-1 flex flex-wrap gap-2">
          <SingleCategoryFilter
            items={techstacks}
            seletedItem={selectedTechstack || ''}
            setSelectedItem={setSelectedTechstack}
          />
        </div>

        <Separator orientation="vertical" />

        <div className="flex-1 flex flex-wrap gap-2">
          <SingleCategoryFilter
            items={tags}
            seletedItem={selectedTag || ''}
            setSelectedItem={setSelectedTag}
          />
        </div>
      </div>
    </div>
  );
}

function SingleCategoryFilter({
  items,
  seletedItem,
  setSelectedItem,
}: {
  items: BaseSelectItem[];
  seletedItem: string;
  setSelectedItem: (id: string) => void;
}) {
  return (
    <div className="hidden md:flex md:flex-wrap items-start md:gap-2">
      <div className="container-bg shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)] rounded-full">
        <Button
          variant={seletedItem === '' ? 'default' : 'outline'}
          onClick={() => setSelectedItem('')}
          className="rounded-full"
        >
          All
        </Button>
      </div>

      {items.map((it) => (
        <div
          key={it.id}
          className="container-bg shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)] rounded-full"
        >
          <Button
            variant={seletedItem === it.id ? 'default' : 'outline'}
            onClick={() => setSelectedItem(it.id)}
            className="rounded-full"
          >
            {it.label}
          </Button>
        </div>
      ))}
    </div>
  );
}
