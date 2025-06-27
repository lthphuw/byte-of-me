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

import { LiquidGlass } from './liquid-glass';

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
          <LiquidGlass
            variant="button"
            intensity="medium"
            className="bg-transparent w-full rounded-xl"
            disableJiggle
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select techstack" />
            </SelectTrigger>
          </LiquidGlass>

          <SelectContent>
            <SelectItem key={''} value={''}>
              All
            </SelectItem>
            {techstacks.map((it, index) => (
              <SelectItem key={it.id} value={it.id}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <LiquidGlass
            variant="button"
            intensity="medium"
            className="bg-transparent w-full rounded-xl"
            disableJiggle
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tag" />
            </SelectTrigger>
          </LiquidGlass>
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
      <div className="hidden md:flex md:flex-wrap md:gap-2">
        <SingleCategoryFilter
          items={techstacks}
          seletedItem={selectedTechstack || ''}
          setSelectedItem={setSelectedTechstack}
        />

        {/* Divider */}
        <div className="min-h-[1em] w-[2.5px] self-stretch bg-gradient-to-tr from-transparent via-neutral-500 to-transparent opacity-25 dark:via-neutral-400"></div>

        <SingleCategoryFilter
          items={tags}
          seletedItem={selectedTag || ''}
          setSelectedItem={setSelectedTag}
        />
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
    <div className="hidden md:flex md:flex-wrap md:gap-2">
      <LiquidGlass
        key={-1}
        variant="button"
        intensity="medium"
        className="bg-transparent !rounded-full"
      >
        <Button
          key={-1}
          variant={seletedItem === '' ? 'default' : 'outline'}
          onClick={() => setSelectedItem('')}
          className="rounded-full"
        >
          All
        </Button>
      </LiquidGlass>

      {items.map((it, index) => (
        <LiquidGlass
          key={index}
          variant="button"
          intensity="medium"
          className="bg-transparent !rounded-full"
        >
          <Button
            key={it.id}
            variant={seletedItem === it.id ? 'default' : 'outline'}
            onClick={() => setSelectedItem(it.id)}
            className="rounded-full"
          >
            {it.label}
          </Button>
        </LiquidGlass>
      ))}
    </div>
  );
}
