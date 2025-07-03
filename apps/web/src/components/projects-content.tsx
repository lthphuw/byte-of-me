'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import Fuse from 'fuse.js';
import { debounce } from 'lodash';

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

  const [previewItems, setPreviewItems] = useState<SearchItem[]>([]);
  const [showedItems, setShowedItems] = useState<Project[]>(projects);
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('q') || ''
  );
  const [debouncedQuery, setDebouncedQuery] = useState<string>(
    searchParams.get('q') || ''
  );
  const [selectedTag, setSelectedTag] = useState<string>(
    searchParams.get('tag') || ''
  );
  const [selectedTechstack, setSelectedTechstack] = useState<string>(
    searchParams.get('tech') || ''
  );
  const [isLoading, setIsLoading] = useState(false);

  // Initialize fuzzy search
  const fuse = useMemo(() => new Fuse(projects, fuseOptions), [projects]);

  // Extract unique techstacks and tags
  const techstacks = useMemo(() => {
    const set = new Set<string>();
    return projects
      .flatMap((proj) => proj.techstacks)
      .filter((it) => !set.has(it.id) && set.add(it.id))
      .map((it) => ({ id: it.id, label: it.name }));
  }, [projects]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    return projects
      .flatMap((proj) => proj.tags)
      .filter((it) => !set.has(it.id) && set.add(it.id))
      .map((it) => ({ id: it.id, label: it.name }));
  }, [projects]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setDebouncedQuery(query);
      }, 500),
    []
  );

  // Handle search query change
  const handleSearchQueryChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setIsLoading(true);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  // Update URL parameters
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedTechstack) params.set('tech', selectedTechstack);
    if (selectedTag) params.set('tag', selectedTag);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchQuery, selectedTechstack, selectedTag, pathname, router]);

  // Sync URL parameters when filters change
  useEffect(() => {
    updateUrlParams();
  }, [searchQuery, selectedTechstack, selectedTag, updateUrlParams]);

  // Filter projects based on query, tag, and techstack
  useEffect(() => {
    let filteredProjects = projects;

    // Apply search query filter
    if (debouncedQuery.trim()) {
      const fuzzyItems = fuse.search(debouncedQuery);
      filteredProjects = fuzzyItems.map((it) => it.item);
      setPreviewItems(
        fuzzyItems.slice(0, 5).map((res) => ({
          id: res.item.id,
          label: res.item.title,
          desc: res.item.description || '',
        }))
      );
    } else {
      setPreviewItems([]);
    }

    // Apply tag filter
    if (selectedTag) {
      filteredProjects = filteredProjects.filter((project) =>
        project.tags.some((tag) => tag.id === selectedTag)
      );
    }

    // Apply techstack filter
    if (selectedTechstack) {
      filteredProjects = filteredProjects.filter((project) =>
        project.techstacks.some((tech) => tech.id === selectedTechstack)
      );
    }

    setShowedItems(filteredProjects);
    setIsLoading(false);
  }, [debouncedQuery, selectedTag, selectedTechstack, fuse, projects]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className="container w-full px-0 py-8">
      <div className="flex flex-col items-stretch gap-8">
        <div className="md:col-span-1 md:sticky md:top-4 md:h-fit">
          <SearchBar
            previewItems={previewItems}
            searchQuery={searchQuery}
            setSearchQuery={handleSearchQueryChange}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
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
        <ProjectList isLoading={isLoading} projects={showedItems} />
      </div>
    </div>
  );
}
