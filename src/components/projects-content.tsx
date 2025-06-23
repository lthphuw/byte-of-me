"use client";

import { CategoryFilter } from '@/components/category-filter';
import { SearchBar, SearchItem } from '@/components/search-bar';
import { Trie } from '@/lib/core/algorithms/trie';
import { debounce } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import { Project, ProjectList } from './project-list';

interface ProjectsContentProps {
    projects: Project[];
}
export function ProjectsContent({ projects }: ProjectsContentProps) {
    // State for search query and selected categories
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [selectedTechstack, setSelectedTechstack] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [prefix, setPrefix] = useState('');

    const techstacks = useMemo(() => {
        const set = new Set();
        const result = [];
        for (const proj of projects) {
            for (const it of proj.techstacks) {
                if (!set.has(it.id)) {
                    result.push({
                        id: it.id,
                        label: it.name,
                    })
                }
                set.add(it.id);
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
                    result.push({
                        id: it.id,
                        label: it.name,
                    })
                }
                set.add(it.id);
            }
        }
        return result;
    }, [projects]);

    const categorizedProjects = useMemo(() => projects.filter(it =>
        (!selectedTag || Boolean(it.tags.find(tag => tag.id === selectedTag))) &&
        (!selectedTechstack || Boolean(it.techstacks.find(tag => tag.id === selectedTechstack)))
    ), [selectedTag, selectedTechstack]);

    const items = useMemo(() => [
        ...categorizedProjects.map(it => ({
            id: it.id,
            label: it.title
        })),
        // ...projects.map(it => ({
        //     id: it.id,
        //     label: it.description || ''
        // }))
    ], [categorizedProjects]);

    const trie = useMemo(() => {
        const _trie = new Trie();
        for (const it of items) {
            _trie.insert(it.label, it.id);
        }
        return _trie;
    }, [items]);

    const previewItems: SearchItem[] = useMemo(() => {
        if (prefix && trie) {
            return trie.searchPrefix(prefix).map(it => ({
                id: it.id || '',
                label: it.word || '',
            }));
        }
        return [];
    }, [prefix, trie]);

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

    const showedProjects = useMemo(() => categorizedProjects.filter(it =>
        it.title.includes(prefix) || it.description?.includes(prefix)
    ), [categorizedProjects, prefix]);
    
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

