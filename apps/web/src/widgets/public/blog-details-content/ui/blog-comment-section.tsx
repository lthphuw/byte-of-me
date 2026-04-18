'use client';

import { useEffect } from 'react';
import { useIntersection } from '@mantine/hooks';
import { useTranslations } from 'next-intl';

import {
  CommentForm,
  CommentList,
  CommentListEmpty,
  CommentListSkeleton,
  useCommentInfiniteQuery,
} from '@/entities';
import { Button } from '@/shared/ui/button';
import Loading from '@/shared/ui/loading';

export interface BlogCommentSectionProps {
  blogId: string;
}

export function BlogCommentSection({ blogId }: BlogCommentSectionProps) {
  const t = useTranslations('blogDetails');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCommentInfiniteQuery(blogId, 8);

  const { ref, entry } = useIntersection({
    root: null,
    threshold: 1,
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage]);

  const allComments = data?.pages.flatMap((page) => page.data) || [];

  return (
    <div id="comments" className="space-y-8">
      <h3 className="text-xl font-bold tracking-tight">{t('comments')}</h3>
      <CommentForm blogId={blogId} disabled />

      <div className="space-y-2">
        {isLoading ? (
          <CommentListSkeleton />
        ) : allComments.length === 0 ? (
          <CommentListEmpty />
        ) : (
          <>
            <CommentList comments={allComments} />

            <div
              ref={ref}
              className="flex h-10 items-center justify-center py-4"
            >
              {!isFetchingNextPage && (
                <>
                  <Loading />
                  <p className="animate-pulse text-sm text-muted-foreground">
                    {t('loadMoreComments')}
                  </p>
                </>
              )}
            </div>

            {hasNextPage && !isFetchingNextPage && (
              <div className="flex justify-center pt-4">
                <Button variant="ghost" onClick={() => fetchNextPage()}>
                  {t('loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
