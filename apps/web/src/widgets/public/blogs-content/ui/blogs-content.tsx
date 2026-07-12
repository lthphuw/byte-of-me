'use client';

import { useState } from 'react';
import { Pagination } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';

import {
  BlogCard,
  BlogCardSkeleton,
  BlogEmpty,
  getPaginatedPublicBlogs,
} from '@/entities';
import { BlogFilters, useBlogFilters } from '@/features/public';
import { RevealItem } from '@/shared/ui';
import { BlogsShell } from '@/widgets/public/blogs-content/ui/blogs-shell';

export function BlogsContent() {
  const [page, setPage] = useState(1);
  const { filters, updateFilters } = useBlogFilters();
  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['public-blogs', page, filters],
    queryFn: () => getPaginatedPublicBlogs({ ...filters, page, limit: 6 }),
    placeholderData: (previousData) => previousData,
    // The server-prefetched default page is already fresh (the route is
    // force-dynamic), so don't immediately refetch it on mount — that avoids
    // flashing skeletons over hydrated data. Filter/page changes use a new key
    // and still fetch live.
    staleTime: 5 * 60 * 1000,
  });

  const blogs = data?.data?.data || [];
  const pagination = data?.data?.meta || {
    currentPage: 1,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  };
  const hasActiveFilters =
    filters?.search?.length > 0 || filters?.tagSlugs?.length > 0;

  const toggleTag = (slug: string) => {
    setPage(1);

    const nextTags = filters.tagSlugs.includes(slug)
      ? filters.tagSlugs.filter((s) => s !== slug)
      : [...filters.tagSlugs, slug];

    updateFilters({ ...filters, tagSlugs: nextTags });
  };

  return (
    <BlogsShell>
      <div className="container flex flex-col gap-6 px-0 py-8 md:gap-8 md:px-6">
        <BlogFilters
          value={filters}
          onChange={(next) => {
            setPage(1);
            updateFilters(next);
          }}
        />

        {/* BLOG GRID */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {isLoading || (isFetching && !isPlaceholderData) ? (
            Array.from({ length: 3 }).map((_, i) => (
              <BlogCardSkeleton key={i} />
            ))
          ) : blogs.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-10">
              <BlogEmpty isSearch={hasActiveFilters} />
            </div>
          ) : (
            <div
              className={`contents transition-opacity duration-300 ${
                isPlaceholderData
                  ? 'pointer-events-none opacity-50 grayscale-[50%]'
                  : 'opacity-100'
              }`}
            >
              {blogs.map((blog, index) => (
                <RevealItem key={blog.id} index={index}>
                  <BlogCard blog={blog} onTagClick={(slug) => toggleTag(slug)} />
                </RevealItem>
              ))}
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <Pagination
          setPage={setPage}
          pagination={pagination}
          isPlaceholderData={isPlaceholderData}
        />
      </div>
    </BlogsShell>
  );
}
