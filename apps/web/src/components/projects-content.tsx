'use client';

import { debounce } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import { CategoryFilter } from '@/components/category-filter';
import { SearchBar, SearchItem } from '@/components/search-bar';
import { Trie } from '@/lib/core/algorithms/trie';

import { Project, ProjectList } from './project-list';

interface ProjectsContentProps {
  projects: Project[];
}

export function ProjectsContent({ projects }: ProjectsContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedTechstack, setSelectedTechstack] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [prefix, setPrefix] = useState('');

  // All techstacks
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

  // All tags
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

  // Lọc theo tag & techstack
  const categorizedProjects = useMemo(() => {
    return projects.filter(
      (it) =>
        (!selectedTag ||
          it.tags.some((tag) => tag.id === selectedTag)) &&
        (!selectedTechstack ||
          it.techstacks.some((stack) => stack.id === selectedTechstack))
    );
  }, [projects, selectedTag, selectedTechstack]);

  // Danh sách item search, mỗi project tạo 1 item với cả title & description
  const items = useMemo(() => {
    return categorizedProjects.map((it) => ({
      id: it.id,
      label: it.title,
      desc: it.description || '',
    }));
  }, [categorizedProjects]);

  // Tạo Trie
  const trie = useMemo(() => {
    const _trie = new Trie();
    for (const it of items) {
      _trie.insert(it.label, it.id); // title
      if (it.desc) {
        _trie.insert(it.desc, it.id); // description
      }
    }
    return _trie;
  }, [items]);

  // Kết quả preview trong SearchBar
  const previewItems: SearchItem[] = useMemo(() => {
    if (!prefix || !trie) return [];

    const rawResults = trie.searchPrefix(prefix); // { word, id }
    const grouped = Object.groupBy(rawResults, (r) => r.id || '');

    return Object.entries(grouped).map(([id]) => {
      const match = items.find((it) => it.id === id);
      return {
        id,
        label: match?.label || '',
        desc: match?.desc || '',
      };
    });
  }, [prefix, trie, items]);

  // Debounce prefix search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setPrefix(query);
      setIsLoading(false);
    }, 500),
    []
  );

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    debouncedSearch(query);
  };

  // Kết quả chính thức hiển thị ra ProjectList
  const showedProjects = useMemo(() => {
    const lowerPrefix = prefix.toLowerCase();
    return categorizedProjects.filter(
      (it) =>
        it.title.toLowerCase().includes(lowerPrefix) ||
        it.description?.toLowerCase().includes(lowerPrefix)
    );
  }, [categorizedProjects, prefix]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-stretch gap-8">
        {/* Sidebar: Search and Filter */}
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

        {/* Project List */}
        <ProjectList projects={showedProjects} />
      </div>
    </div>
  );
}
