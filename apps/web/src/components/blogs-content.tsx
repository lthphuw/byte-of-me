'use client';

import { useState } from 'react';
import { Blog } from '@/models/blog';
import { Tag } from '@/models/tag';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { PaginatedData } from '@/types/api/paginated.type';
import { getPaginatedPublicBlogs } from '@/lib/actions/public/get-paginated-public-blogs';
import { BlogCard } from '@/components/blog-card';
import { BlogFilter } from '@/components/blog-filter';
import { EmptyBlog } from '@/components/empty-blog';
import Loading from '@/components/loading';
import { Pagination } from '@/components/pagination';

interface BlogsContentProps {
  initBlogs: PaginatedData<Blog>;
  tags: Tag[];
}

export function BlogsContent({ initBlogs, tags }: BlogsContentProps) {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    tagSlugs: [] as string[],
    search: '',
  });

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['public-blogs', page, filters],
    queryFn: () => getPaginatedPublicBlogs({ ...filters, page, limit: 9 }),
    placeholderData: (previousData) => previousData,
    initialData: {
      success: true,
      data: initBlogs,
    },
  });

  const blogs = data?.data?.data || [];
  const pagination = data?.data?.meta || {
    currentPage: 1,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  };

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
    <div className="container px-0 py-8 md:px-6 flex flex-col gap-6 md:gap-8">
      <BlogFilter
        tags={tags}
        value={filters}
        onChange={(next) => {
          setPage(1);
          setFilters(next);
        }}
      />

      {/* PROJECT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center py-10">
            <Loading />
          </div>
        ) : blogs.length === 0 ? (
          <div className="col-span-full flex justify-center items-center py-10">
            <EmptyBlog message={t('blog.noBlogsMatchYourSearch')} />
          </div>
        ) : (
          blogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              onTagClick={(slug) => toggleTag(slug)}
            />
          ))
        )}
      </div>

      {/* PAGINATION */}
      <Pagination
        setPage={setPage}
        pagination={pagination}
        isPlaceholderData={isPlaceholderData}
      />
    </div>
  );
}
