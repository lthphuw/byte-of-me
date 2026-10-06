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
import { BlogFilters, useBlogFilters } from '@/features/public/blog-filters';
import { ListPageHeader, RevealItem } from '@/shared/ui';
import { BlogsShell } from '@/widgets/public/blogs-content/ui/blogs-shell';

// Two columns from md up, so the first row is the two cards above the fold.
const FIRST_ROW_COUNT = 2;

export function BlogsContent() {
  const t = useTranslations('blog');
  const tPagination = useTranslations('components.pagination');
  const { filters, page, updateFilters, setPage } = useBlogFilters();
  // The toggle is only offered to an admin session; the server re-checks the
  // role anyway, so the flag is harmless in anyone else's hands.
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [showDrafts, setShowDrafts] = useState(false);
  const includeDrafts = isAdmin && showDrafts;
  const { data, isLoading, isPlaceholderData } = useQuery({
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
    // so never refetch it on mount. Only `Infinity` does that: the hydrated
    // entry carries the build's `dataUpdatedAt`, older than any finite value.
    // Filter/page changes use a new key and still fetch live.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
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

  // Only when there is genuinely nothing to show. `isFetching` cannot be part
  // of this: it blanked a fully rendered list behind skeletons whenever a
  // background refetch ran. A refetch updates the list in place instead.
  const showSkeletons = isLoading;

  const toggleTag = (slug: string) => {
    const nextTags = filters.tagSlugs.includes(slug)
      ? filters.tagSlugs.filter((s) => s !== slug)
      : [...filters.tagSlugs, slug];

    updateFilters({ ...filters, tagSlugs: nextTags });
  };

  return (
    <BlogsShell>
      {/* No `description`: the strapline was write-around-the-subject filler
          that said less than the post titles underneath it. The count alone is
          the subtitle. Projects drops its strapline for the same reason. */}
      <ListPageHeader
        title={t('pageTitle')}
        count={t('count', { count: pagination.totalCount })}
      >
        <BlogFilters value={filters} onChange={updateFilters} />

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
                    // The drafts variant is a different key with a different
                    // page count, so page 3 may not exist in it — but `setPage`
                    // is a URL write now, and on page 1 it would push a history
                    // entry for the identical URL on every toggle.
                    if (page !== 1) setPage(1);
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
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
          className={`grid grid-cols-1 gap-6 transition-opacity duration-300 md:grid-cols-2 md:gap-10 ${
            isPlaceholderData
              ? 'pointer-events-none opacity-50 grayscale-[50%]'
              : 'opacity-100'
          }`}
        >
          {blogs.map((blog, index) => (
            <RevealItem
              key={blog.id}
              index={index}
              immediate={index < FIRST_ROW_COUNT}
            >
              <BlogCard blog={blog} onTagClick={toggleTag} />
            </RevealItem>
          ))}
        </div>
      )}

      <Pagination
        setPage={setPage}
        pagination={pagination}
        isPlaceholderData={isPlaceholderData}
        pageLabel={tPagination('pageLabel', {
          page: pagination?.currentPage ?? 1,
          totalPages: pagination?.totalPages ?? 1,
        })}
        previousLabel={tPagination('previous')}
        nextLabel={tPagination('next')}
      />
    </BlogsShell>
  );
}
