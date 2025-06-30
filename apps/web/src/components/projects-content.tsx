// 'use client';
'use client';

import Fuse from 'fuse.js';
import { debounce } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedTechstack, setSelectedTechstack] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const techstacks = useMemo(() => {
    const set = new Set();
    const result = [];
    for (const proj of projects) {
      for (const it of proj.techstacks) {
        if (!set.has(it.id)) {
          result.push({ id: it.id, label: it.name });
          set.add(it.id);
        }
      }
    }
    return result;
  }, [projects]);

  const tags = useMemo(() => {
    const set = new Set();
    const result = [];
    for (const proj of projects) {
      for (const it of proj.tags) {
        if (!set.has(it.id)) {
          result.push({ id: it.id, label: it.name });
          set.add(it.id);
        }
      }
    }
    return result;
  }, [projects]);

  const categorizedProjects = useMemo(() => {
    return projects.filter(
      (it) =>
        (!selectedTag || it.tags.some((tag) => tag.id === selectedTag)) &&
        (!selectedTechstack ||
          it.techstacks.some((stack) => stack.id === selectedTechstack))
    );
  }, [projects, selectedTag, selectedTechstack]);

  const fuse = useMemo(
    () => new Fuse(categorizedProjects, fuseOptions),
    [categorizedProjects]
  );

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setDebouncedQuery(query);
      setIsLoading(false);
    }, 1000),
    []
  );

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    debouncedSearch(query);
  };

  const previewItems: SearchItem[] = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return fuse
      .search(debouncedQuery)
      .slice(0, 5)
      .map((res) => ({
        id: res.item.id,
        label: res.item.title,
        desc: res.item.description || '',
      }));
  }, [debouncedQuery, fuse]);

  const showedProjects = useMemo(() => {
    if (!debouncedQuery.trim()) return categorizedProjects;
    return fuse.search(debouncedQuery).map((res) => res.item);
  }, [debouncedQuery, categorizedProjects, fuse]);

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

        <ProjectList projects={showedProjects} />
      </div>
    </div>
  );
}
