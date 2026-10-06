'use client';

import { useEffect, useMemo } from 'react';
import { Button, Loading, useIntersection } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

// Narrow import on purpose — see `blog-comment-section.tsx`.
import {
  CommentList,
  CommentListEmpty,
  CommentListSkeleton,
  type PublicComment,
} from '@/entities/comment';
import { useCommentInfiniteQuery } from '@/entities/comment/query';

/**
 * The paginated list, split out so its query only starts once the section
 * mounts it: `useCommentInfiniteQuery` has no `enabled` switch to gate it with.
 */
export function BlogCommentThread({
  blogId,
  limit,
  onComment,
  onRequireAuth,
}: {
  blogId: string;
  limit: number;
  onComment: (content: string, parentId?: string) => void;
  onRequireAuth: () => void;
}) {
  const t = useTranslations('blogDetails');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useCommentInfiniteQuery(blogId, limit);

  const { ref, entry } = useIntersection({
    root: null,
    threshold: 0.1,
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allComments = useMemo(() => {
    const map = new Map<string, PublicComment>();

    data?.pages.forEach((page) => {
      page.data.forEach((comment) => {
        map.set(comment.id, comment);
      });
    });

    return Array.from(map.values());
  }, [data]);

  if (isPending) return <CommentListSkeleton />;
  if (allComments.length === 0) return <CommentListEmpty />;

  return (
    <>
      <CommentList
        blogId={blogId}
        comments={allComments}
        onComment={onComment}
        onRequireAuth={onRequireAuth}
      />

      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loading />
          <p className="text-sm text-muted-foreground">
            {t('loadMoreComments')}
          </p>
        </div>
      )}

      {hasNextPage && <div ref={ref} className="h-4" />}

      {hasNextPage && !isFetchingNextPage && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" onClick={() => fetchNextPage()}>
            {t('loadMore')}
          </Button>
        </div>
      )}
    </>
  );
}
