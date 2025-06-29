'use client';

import { BaseSelectItem } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
        <Select value={selectedTechstack} onValueChange={setSelectedTechstack}>
          <div className="container-bg shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)] w-full rounded-xl">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select techstack" />
            </SelectTrigger>
          </div>
          <SelectContent>
            <SelectItem key={''} value={''}>
              All
            </SelectItem>
            {techstacks.map((it) => (
              <SelectItem key={it.id} value={it.id}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <div className="container-bg shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)] w-full rounded-xl">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tag" />
            </SelectTrigger>
          </div>
          <SelectContent>
            <SelectItem key={''} value={''}>
              All
            </SelectItem>
            {tags.map((it) => (
              <SelectItem key={it.id} value={it.id}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

        <div className="min-h-[1em] w-[2.5px] self-stretch opacity-20 rounded-md bg-slate-800 dark:bg-slate-800 dark:opacity-100 shadow-xl"></div>

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
