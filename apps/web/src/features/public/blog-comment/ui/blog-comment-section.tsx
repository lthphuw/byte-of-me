'use client';

import { useEffect, useMemo } from 'react';
import { useIntersection } from '@mantine/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
  CommentForm,
  commentKey,
  CommentList,
  CommentListEmpty,
  CommentListSkeleton,
  postComment,
  useCommentInfiniteQuery,
} from '@/entities';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import Loading from '@/shared/ui/loading';

export interface BlogCommentSectionProps {
  blogId: string;
}

export function BlogCommentSection({ blogId }: BlogCommentSectionProps) {
  const t = useTranslations('blogDetails');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const limit = 4;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCommentInfiniteQuery(blogId, limit);

  const key = commentKey(blogId, limit);
  const mutation = useMutation({
    mutationFn: (text: string) => postComment(blogId, text),

    onMutate: async (newText) => {
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (old: Any) => {
        if (!old) return old;

        const optimistic = {
          id: `temp-${Date.now()}`,
          content: newText,
          createdAt: new Date().toISOString(),
          user: { name: '...', email: '...' },
        };

        return {
          ...old,
          pages: old.pages.map((page: Any, i: number) =>
            i === 0 ? { ...page, data: [optimistic, ...page.data] } : page
          ),
        };
      });

      return { previous };
    },

    onSuccess: (result) => {
      if (!result.success) return;

      queryClient.setQueryData(key, (old: Any) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page: Any, i: number) =>
            i === 0
              ? {
                  ...page,
                  data: [
                    result.data,
                    ...page.data.filter((c: Any) => !c.id.startsWith('temp-')),
                  ],
                }
              : page
          ),
        };
      });
    },

    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(key, ctx?.previous);
      toast({
        title: t('postCommentFailed'),
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
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
    const map = new Map<string, any>();

    data?.pages.forEach((page) => {
      page.data.forEach((comment: Any) => {
        map.set(comment.id, comment);
      });
    });

    return Array.from(map.values());
  }, [data]);

  return (
    <div id="comments" className="space-y-8">
      <h3 className="text-xl font-bold tracking-tight">{t('comments')}</h3>

      <CommentForm
        blogId={blogId}
        isPending={mutation.isPending}
        onComment={(content) => mutation.mutate(content)}
      />

      <div className="space-y-2">
        {isLoading ? (
          <CommentListSkeleton />
        ) : allComments.length === 0 ? (
          <CommentListEmpty />
        ) : (
          <>
            <CommentList comments={allComments} />

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
        )}
      </div>
    </div>
  );
}
