'use client';

import { useEffect, useRef, useState } from 'react';
import { QueryState } from '@byte-of-me/query';
import {
  Button,
  Pagination,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@byte-of-me/ui';
import { NotebookPen, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

// Narrow import on purpose: the `@/entities` root barrel pulls unrelated
// server-rendering modules (education-item -> RichText -> tiptap) into the
// public bundle, so a client component imports the slice instead.
import { BlogCardSkeleton, BlogEmpty } from '@/entities/blog';
import { usePublicBlogList } from '@/entities/blog/query';
import { BlogFilters, useBlogFilters } from '@/features/public/blog-filters';
import { ListPageHeader } from '@/shared/ui';
import { BlogsGrid } from '@/widgets/public/blogs-content/ui/blogs-grid';
import { BlogsShell } from '@/widgets/public/blogs-content/ui/blogs-shell';

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
  // The drafts variant only exists after an admin interaction, so it fetches
  // live; the base key hydrates from the server prefetch in blogs/page.tsx.
  const { data, isLoading, isError, isPlaceholderData, refetch } =
    usePublicBlogList(page, filters, includeDrafts);

  const blogs = data?.data ?? [];
  const pagination = data?.meta ?? {
    currentPage: 1,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  };
  const hasActiveFilters =
    filters?.search?.length > 0 || filters?.tagSlugs?.length > 0;

  // The entrance belongs to the first result set of this mount. A ref, not
  // state: flipping it must not cost a render, and the grid reads it at mount.
  const hasResults = blogs.length > 0;
  const entrancePlayed = useRef(false);
  useEffect(() => {
    if (hasResults) entrancePlayed.current = true;
  }, [hasResults]);

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
        // No count until a result exists: the fallback total of 0 would read
        // "No posts" beside a skeleton or a failed read.
        count={data ? t('count', { count: pagination.totalCount }) : undefined}
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

      <QueryState
        isLoading={isLoading}
        isError={isError}
        // The empty case renders below as `BlogEmpty`, which tells a search
        // with no matches from a blog with no posts.
        isEmpty={false}
        onRetry={() => void refetch()}
        skeleton={
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        }
        errorTitle={t('loadErrorTitle')}
        errorDescription={t('loadErrorDescription')}
        retryLabel={t('retry')}
        emptyTitle={t('noBlogsFound')}
      >
        {blogs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <BlogEmpty isSearch={hasActiveFilters} />
          </div>
        ) : (
          <BlogsGrid
            blogs={blogs}
            playEntrance={!entrancePlayed.current}
            isStale={isPlaceholderData}
            onTagClick={toggleTag}
          />
        )}
      </QueryState>

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
