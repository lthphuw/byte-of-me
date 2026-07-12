'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Loading,useIntersection } from '@byte-of-me/ui';
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  CommentForm,
  commentKey,
  CommentList,
  CommentListEmpty,
  CommentListSkeleton,
  postComment,
  type PublicComment,
  useCommentInfiniteQuery,
} from '@/entities';
import { AuthModal } from '@/features/auth';
import type { PaginatedData } from '@/shared/types/api';

type CommentsCache = InfiniteData<PaginatedData<PublicComment>>;

export interface BlogCommentSectionProps {
  blogId: string;
}

export function BlogCommentSection({ blogId }: BlogCommentSectionProps) {
  const t = useTranslations('blogDetails');
  const queryClient = useQueryClient();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const limit = 4;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCommentInfiniteQuery(blogId, limit);

  const key = commentKey(blogId, limit);
  const mutation = useMutation({
    mutationFn: ({
      content,
      parentId,
    }: {
      content: string;
      parentId?: string;
    }) => postComment(blogId, content, parentId),

    onMutate: async ({ content, parentId }) => {
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<CommentsCache>(key);

      const tempId = `temp-${Date.now()}`;

      const optimistic: PublicComment = {
        id: tempId,
        content,
        parentId,
        createdAt: new Date(),
        user: { id: tempId, name: '...' },
        children: [],
      };

      queryClient.setQueryData<CommentsCache>(key, (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page, i) => {
            if (i !== 0) return page;

            if (!parentId) {
              return {
                ...page,
                data: [optimistic, ...page.data],
              };
            }

            return {
              ...page,
              data: page.data.map((c) => {
                if (c.id === parentId) {
                  return {
                    ...c,
                    children: [...(c.children || []), optimistic],
                  };
                }
                return c;
              }),
            };
          }),
        };
      });

      return { previous, tempId };
    },

    onSuccess: (result, _vars, ctx) => {
      if (!result.success) return;

      queryClient.setQueryData<CommentsCache>(key, (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page, i) => {
            if (i !== 0) return page;

            return {
              ...page,
              data: page.data.map((c) => {
                if (c.id === ctx?.tempId) {
                  return result.data;
                }

                if (c.children) {
                  return {
                    ...c,
                    children: c.children.map((child) =>
                      child.id === ctx?.tempId ? result.data : child
                    ),
                  };
                }

                return c;
              }),
            };
          }),
        };
      });
    },

    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(key, ctx?.previous);
      toast(t('postCommentFailed'));
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
    const map = new Map<string, PublicComment>();

    data?.pages.forEach((page) => {
      page.data.forEach((comment) => {
        map.set(comment.id, comment);
      });
    });

    return Array.from(map.values());
  }, [data]);

  return (
    <div id="comments" className="space-y-8">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <h3 className="text-xl font-bold tracking-tight">{t('comments')}</h3>

      <CommentForm
        blogId={blogId}
        isPending={mutation.isPending}
        onComment={(content) => mutation.mutate({content})}
        onRequireAuth={() => setIsAuthModalOpen(true)}
      />

      <div className="space-y-2">
        {isLoading ? (
          <CommentListSkeleton />
        ) : allComments.length === 0 ? (
          <CommentListEmpty />
        ) : (
          <>
            <CommentList
              blogId={blogId}
              comments={allComments}
              onComment={(content, parentId) => mutation.mutate({content, parentId})}
              onRequireAuth={() => setIsAuthModalOpen(true)}
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
        )}
      </div>
    </div>
  );
}
