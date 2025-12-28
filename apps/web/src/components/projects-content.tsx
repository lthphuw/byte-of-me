'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useDebouncedValue } from '@mantine/hooks';
import Fuse from 'fuse.js';

import { CategoryFilter } from '@/components/category-filter';
import { SearchBar, SearchItem } from '@/components/search-bar';

import { Project, ProjectList } from './project-list';

interface ProjectsContentProps {
  projects: Project[];
}

const fuseOptions = {
  keys: ['title', 'description', 'techstacks.name', 'tags.name'],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function ProjectsContent({ projects }: ProjectsContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
  const isTyping = searchQuery !== debouncedQuery;

  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.getAll('tag')
  );
  const [selectedTechstacks, setSelectedTechstacks] = useState<string[]>(
    searchParams.getAll('tech')
  );

  const fuse = useMemo(() => {
    return new Fuse(projects, fuseOptions);
  }, [projects]);

  const techstacks = useMemo(() => {
    const seen = new Set<string>();
    return projects
      .flatMap((p) => p.techstacks)
      .filter((t) => !seen.has(t.id) && seen.add(t.id))
      .map((t) => ({ id: t.id, label: t.name }));
  }, [projects]);

  const tags = useMemo(() => {
    const seen = new Set<string>();
    return projects
      .flatMap((p) => p.tags)
      .filter((t) => !seen.has(t.id) && seen.add(t.id))
      .map((t) => ({ id: t.id, label: t.name }));
  }, [projects]);

  const { showedItems, previewItems } = useMemo(() => {
    let filtered = projects;
    let preview: SearchItem[] = [];

    if (debouncedQuery.trim()) {
      const results = fuse.search(debouncedQuery);
      filtered = results.map((r) => r.item);
      preview = results.slice(0, 5).map((r) => ({
        id: r.item.id,
        label: r.item.title,
        desc: r.item.description || '',
      }));
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.some((id) => p.tags.some((t) => t.id === id))
      );
    }

    if (selectedTechstacks.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTechstacks.some((id) => p.techstacks.some((t) => t.id === id))
      );
    }

    return {
      showedItems: filtered.sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
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
          techstacks={techstacks}
          tags={tags}
          selectedTags={selectedTags}
          selectedTechstacks={selectedTechstacks}
          setSelectedTags={setSelectedTags}
          setSelectedTechstacks={setSelectedTechstacks}
        />
      </div>

      <ProjectList
        isLoading={isTyping}
        projects={showedItems}
      />
    </div>
  );
}
