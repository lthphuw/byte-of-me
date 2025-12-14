'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import Fuse from 'fuse.js';

import { useDebounce } from '@/hooks/use-debounce';
import { CategoryFilter } from '@/components/category-filter';
import { SearchBar, SearchItem } from '@/components/search-bar';

import { Project, ProjectList } from './project-list';

interface ProjectsContentProps {
  projects: Project[];
}
const fuseOptions = {
  keys: ['title', 'description', 'techstacks.name', 'tags.name'],
  threshold: 0.4,
};
export function ProjectsContent({ projects }: ProjectsContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(searchParams.getAll('tag'));
  const [selectedTechstacks, setSelectedTechstacks] = useState<string[]>(searchParams.getAll('tech'));
  const debouncedQuery = useDebounce(searchQuery, 400);
  // Init fuzzy search
  const fuse = useMemo(() => new Fuse(projects, fuseOptions), [projects]);
  // Extract unique techstacks and tags
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
  // Filter & search logic in one memo
  const { showedItems, previewItems } = useMemo(() => {
    let filtered = projects;
    let preview: SearchItem[] = [];
    if (debouncedQuery.trim()) {
      const results = fuse.search(debouncedQuery);
      filtered = results.map((r) => r.item);
      preview = results.slice(0, 5).map((res) => ({
        id: res.item.id,
        label: res.item.title,
        desc: res.item.description || '',
      }));
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.some((selectedTag) => p.tags.some((tag) => tag.id === selectedTag))
      );
    }
    if (selectedTechstacks.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTechstacks.some((selectedTech) => p.techstacks.some((tech) => tech.id === selectedTech))
      );
    }
    return {
      showedItems: filtered.sort((a, b) => a.title.localeCompare(b.title)),
      previewItems: preview,
    };
  }, [projects, debouncedQuery, selectedTags, selectedTechstacks, fuse]);
  // Sync URL parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    selectedTechstacks.forEach((tech) => params.append('tech', tech));
    selectedTags.forEach((tag) => params.append('tag', tag));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchQuery, selectedTechstacks, selectedTags, pathname, router]);
  return (
    <div className="container px-4 py-8 md:px-6 flex flex-col items-stretch gap-6 md:gap-8">
      <div className="md:sticky md:top-4 md:h-fit mb-8 md:mb-0">
        <SearchBar
          previewItems={previewItems}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isLoading={searchQuery !== debouncedQuery}
          setIsLoading={() => {
          }}
        />
        <CategoryFilter
          techstacks={techstacks}
          tags={tags}
          setSelectedTags={setSelectedTags}
          setSelectedTechstacks={setSelectedTechstacks}
          selectedTags={selectedTags}
          selectedTechstacks={selectedTechstacks}
        />
      </div>
      <ProjectList
        isLoading={searchQuery !== debouncedQuery}
        projects={showedItems}
      />
    </div>
  );
}
