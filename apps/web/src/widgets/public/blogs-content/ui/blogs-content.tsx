'use client';

import { useState } from 'react';
import { Button, Pagination, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { NotebookPen, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

// Narrow import on purpose: `@/entities` re-exports every entity, so a
// client component importing it drags unrelated server-rendering modules
// (education-item -> RichText -> tiptap) into the public bundle.
import {
  BlogCard,
  BlogCardSkeleton,
  BlogEmpty,
  blogKeys,
  getPaginatedPublicBlogs,
} from '@/entities/blog';
import { BlogFilters, useBlogFilters } from '@/features/public';
import { ListPageHeader, RevealItem } from '@/shared/ui';
import { BlogsShell } from '@/widgets/public/blogs-content/ui/blogs-shell';

export function BlogsContent() {
  const t = useTranslations('blog');
  const [page, setPage] = useState(1);
  const { filters, updateFilters } = useBlogFilters();
  // The toggle is only offered to an admin session; the server re-checks the
  // role anyway, so the flag is harmless in anyone else's hands.
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [showDrafts, setShowDrafts] = useState(false);
  const includeDrafts = isAdmin && showDrafts;
  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    // The drafts variant only exists after an admin interaction, so it may
    // fetch live; the base key hydrates from the server prefetch in
    // blogs/page.tsx.
    queryKey: includeDrafts
      ? blogKeys.publicListWithDrafts(page, filters)
      : blogKeys.publicList(page, filters),
    queryFn: () =>
      getPaginatedPublicBlogs({ ...filters, page, limit: 6, includeDrafts }),
    placeholderData: (previousData) => previousData,
    // The server-prefetched default page comes from a tag-purged cache entry,
    // so don't immediately refetch it on mount — that avoids
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

  const showSkeletons = isLoading || (isFetching && !isPlaceholderData);

  const toggleTag = (slug: string) => {
    setPage(1);

    const nextTags = filters.tagSlugs.includes(slug)
      ? filters.tagSlugs.filter((s) => s !== slug)
      : [...filters.tagSlugs, slug];

    updateFilters({ ...filters, tagSlugs: nextTags });
  };

  return (
    <BlogsShell>
      <ListPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        count={t('count', { count: pagination.totalCount })}
      >
        <BlogFilters
          value={filters}
          onChange={(next) => {
            setPage(1);
            updateFilters(next);
          }}
        />

        {isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={showDrafts ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-8 w-fit gap-2 text-xs"
                  onClick={() => {
                    setPage(1);
                    setShowDrafts((v) => !v);
                  }}
                >
                  <NotebookPen className="size-3.5" />
                  {t('showDrafts')}
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t('showDraftsHint')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </ListPageHeader>

      {showSkeletons ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <BlogEmpty isSearch={hasActiveFilters} />
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 transition-opacity duration-300 md:grid-cols-2 ${
            isPlaceholderData
              ? 'pointer-events-none opacity-50 grayscale-[50%]'
              : 'opacity-100'
          }`}
        >
          {blogs.map((blog, index) => (
            <RevealItem key={blog.id} index={index}>
              <BlogCard blog={blog} onTagClick={toggleTag} />
            </RevealItem>
          ))}
        </div>
      )}

      <Pagination
        setPage={setPage}
        pagination={pagination}
        isPlaceholderData={isPlaceholderData}
      />
    </BlogsShell>
  );
}
