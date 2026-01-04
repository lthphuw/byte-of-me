'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '@mantine/hooks';
import { Tag, TechStack } from '@repo/db/generated/prisma/client';
import Fuse from 'fuse.js';

import { CategoryFilter } from '@/components/category-filter';
import { SearchBar, SearchItem } from '@/components/search-bar';

import { ProjectList, ProjectProps } from './project-list';

interface ProjectsContentProps {
  projects: ProjectProps[];
  tags: Tag[];
  techStacks: TechStack[];
}

const fuseOptions = {
  keys: ['title', 'description', 'techstacks.name', 'tags.name'],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function ProjectsContent({
  projects,
  techStacks,
  tags,
}: ProjectsContentProps) {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
  const isTyping = searchQuery !== debouncedQuery;

  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.getAll('tag')
  );
  const [selectedTechstacks, setSelectedTechstacks] = useState<string[]>(
    searchParams.getAll('tech,stack')
  );

  const fuse = useMemo(() => {
    return new Fuse(projects, fuseOptions);
  }, [projects]);

  const { showedItems, previewItems } = useMemo(() => {
    let filtered = projects;
    let preview: SearchItem[] = [];

    if (debouncedQuery.trim()) {
      const results = fuse.search(debouncedQuery);
      filtered = results.map((r) => r.item);
      preview = results.slice(0, 5).map((r) => ({
        id: r.item.id,
        slug: r.item.slug,
        label: r.item.title,
        desc: r.item.description || '',
      }));
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.some((slug) => p.tags.some((t) => t.tag.slug === slug))
      );
    }

    if (selectedTechstacks.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTechstacks.some((slug) =>
          p.techstacks.some((t) => t.techstack.slug === slug)
        )
      );
    }

    return {
      showedItems: filtered.sort((a, b) => a.title.localeCompare(b.title)),
      previewItems: preview,
    };
  }, [projects, debouncedQuery, selectedTags, selectedTechstacks, fuse]);

  return (
    <div className="container px-4 py-8 md:px-6 flex flex-col gap-6 md:gap-8">
      <div className="md:sticky md:top-4 md:h-fit">
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          previewItems={previewItems}
          isLoading={isTyping}
        />

        <CategoryFilter
          techstacks={techStacks?.map((it) => ({
            id: it.slug || it.id,
            label: it.name,
          }))}
          tags={tags?.map((it) => ({
            id: it.slug || it.id,
            label: it.name,
          }))}
          selectedTags={selectedTags}
          selectedTechstacks={selectedTechstacks}
          setSelectedTags={setSelectedTags}
          setSelectedTechstacks={setSelectedTechstacks}
        />
      </div>

      <ProjectList isLoading={isTyping} projects={showedItems} />
    </div>
  );
}
