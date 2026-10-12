'use client';

import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { postComment } from '@/entities/comment/api/post-comment';
import { commentKeys } from '@/entities/comment/model/query-keys';
import type { PublicComment } from '@/entities/comment/model/types';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';
import type { PaginatedData } from '@/shared/types/api';

type CommentsCache = InfiniteData<PaginatedData<PublicComment>>;

type PostVariables = { content: string; parentId?: string; tempId: string };

/**
 * Posts a comment into one blog's thread. The reply shows at once under a
 * temporary id, is swapped for the saved row on success, and is removed again
 * if the post is refused.
 */
export function usePostComment(blogId: string, limit: number) {
  const t = useTranslations('blogDetails');
  const queryClient = useQueryClient();
  const key = commentKeys.thread(blogId, limit);

  const mutation = useServerMutation<PostVariables, PublicComment>({
    mutationFn: ({ content, parentId }) => postComment(blogId, content, parentId),
    errorMessage: t('postCommentFailed'),
  });

  const post = async (content: string, parentId?: string) => {
    const tempId = `temp-${crypto.randomUUID()}`;

    await queryClient.cancelQueries({ queryKey: key });

    queryClient.setQueryData<CommentsCache>(key, (old) =>
      withOptimisticComment(
        old,
        optimisticComment(tempId, content, parentId),
        parentId
      )
    );

    // `mutateAsync`, not per-call `mutate` callbacks: those belong to the
    // observer's latest call and are dropped when a second reply is posted
    // while the first is in flight.
    try {
      const saved = await mutation.mutateAsync({ content, parentId, tempId });
      queryClient.setQueryData<CommentsCache>(key, (old) =>
        withSavedComment(old, tempId, saved)
      );
    } catch {
      // The refusal is already reported by `useServerMutation`. Remove only
      // this reply, so another reply posted meanwhile keeps its row.
      queryClient.setQueryData<CommentsCache>(key, (old) =>
        withoutComment(old, tempId)
      );
    } finally {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };

  return { post, isPending: mutation.isPending };
}

function optimisticComment(
  tempId: string,
  content: string,
  parentId?: string
): PublicComment {
  return {
    id: tempId,
    content,
    parentId,
    createdAt: new Date(),
    user: { id: tempId, name: '...' },
    children: [],
  };
}

/** Puts the reply on the first page: a root at the top, a reply under its parent. */
function withOptimisticComment(
  old: CommentsCache | undefined,
  comment: PublicComment,
  parentId?: string
) {
  if (!old) return old;

  return {
    ...old,
    pages: old.pages.map((page, i) => {
      if (i !== 0) return page;

      if (!parentId) {
        return { ...page, data: [comment, ...page.data] };
      }

      return {
        ...page,
        data: page.data.map((c) =>
          c.id === parentId
            ? { ...c, children: [...(c.children || []), comment] }
            : c
        ),
      };
    }),
  };
}

/** Drops the temporary row, at either depth, after a refused post. */
function withoutComment(old: CommentsCache | undefined, tempId: string) {
  if (!old) return old;

  return {
    ...old,
    pages: old.pages.map((page, i) => {
      if (i !== 0) return page;

      return {
        ...page,
        data: page.data
          .filter((c) => c.id !== tempId)
          .map((c) =>
            c.children
              ? {
                  ...c,
                  children: c.children.filter((child) => child.id !== tempId),
                }
              : c
          ),
      };
    }),
  };
}

/** Swaps the temporary row for the row the server saved, at either depth. */
function withSavedComment(
  old: CommentsCache | undefined,
  tempId: string,
  saved: PublicComment
) {
  if (!old) return old;

  return {
    ...old,
    pages: old.pages.map((page, i) => {
      if (i !== 0) return page;

      return {
        ...page,
        data: page.data.map((c) => {
          if (c.id === tempId) return saved;

          if (c.children) {
            return {
              ...c,
              children: c.children.map((child) =>
                child.id === tempId ? saved : child
              ),
            };
          }

          return c;
        }),
      };
    }),
  };
}
