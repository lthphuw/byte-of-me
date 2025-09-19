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
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [selectedTechstack, setSelectedTechstack] = useState(
    searchParams.get('tech') || ''
  );

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

    if (selectedTag) {
      filtered = filtered.filter((p) =>
        p.tags.some((tag) => tag.id === selectedTag)
      );
    }

    if (selectedTechstack) {
      filtered = filtered.filter((p) =>
        p.techstacks.some((tech) => tech.id === selectedTechstack)
      );
    }

    return {
      showedItems: filtered.sort((a, b) => a.title.localeCompare(b.title)),
      previewItems: preview,
    };
  }, [projects, debouncedQuery, selectedTag, selectedTechstack, fuse]);

  // Sync URL parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedTechstack) params.set('tech', selectedTechstack);
    if (selectedTag) params.set('tag', selectedTag);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchQuery, selectedTechstack, selectedTag, pathname, router]);


  return (
    <div className="container w-full px-0 py-8">
      <div className="flex flex-col items-stretch gap-8">
        <div className="md:col-span-1 md:sticky md:top-4 md:h-fit">
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
            setSelectedTechstack={setSelectedTechstack}
            setSelectedTag={setSelectedTag}
            selectedTag={selectedTag}
            selectedTechstack={selectedTechstack}
          />
        </div>
        <ProjectList
          isLoading={searchQuery !== debouncedQuery}
          projects={showedItems}
        />
      </div>
    </div>
  );
}
