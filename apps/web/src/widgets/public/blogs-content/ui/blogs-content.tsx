'use client';

import { useState } from 'react';
import { BlogCard, BlogCardSkeleton, BlogEmpty } from '@/entities';
import { getPaginatedPublicBlogs } from '@/entities/blog/api/get-paginated-public-blogs';
import { BlogFilters } from '@/features/public/blog-filters/ui/blog-filters';
import { Pagination } from '@/shared/ui/pagination';
import { BlogsShell } from '@/widgets/public/blogs-content/ui/blogs-shell';
import { useQuery } from '@tanstack/react-query';

export function BlogsContent() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    tagSlugs: [] as string[],
    search: '',
  });

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['public-blogs', page, filters],
    queryFn: () => getPaginatedPublicBlogs({ ...filters, page, limit: 9 }),
    placeholderData: (previousData) => previousData,
  });

  const blogs = data?.data?.data || [];
  const pagination = data?.data?.meta || {
    currentPage: 1,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  };
  const hasActiveFilters =
    filters.search.length > 0 || filters.tagSlugs.length > 0;
  const toggleTag = (slug: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      tagSlugs: prev.tagSlugs.includes(slug)
        ? prev.tagSlugs.filter((s) => s !== slug)
        : [...prev.tagSlugs, slug],
    }));
  };

  return (
    <BlogsShell>
      <div className="container flex flex-col gap-6 px-0 py-8 md:gap-8 md:px-6">
        <BlogFilters
          value={filters}
          onChange={(next) => {
            setPage(1);
            setFilters(next);
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
              {blogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  onTagClick={(slug) => toggleTag(slug)}
                />
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
