'use client';

import { useEffect, useState } from 'react';
import { useIntersection } from '@byte-of-me/ui';
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// Narrow import on purpose: `@/entities` re-exports every entity, so a
// client component importing it drags unrelated server-rendering modules
// (education-item -> RichText -> tiptap) into the public bundle.
import {
  CommentForm,
  commentKey,
  CommentListSkeleton,
  postComment,
  type PublicComment,
} from '@/entities/comment';
import { AuthModal } from '@/features/auth';
import { BlogCommentThread } from '@/features/public/blog-comment/ui/blog-comment-thread';
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

  // The thread sits at the foot of the post, so its query waits until the
  // reader is within 400px of it — early enough to be loaded on arrival — and
  // then stays on, since scrolling back up must not drop the list.
  const { ref: nearRef, entry: nearEntry } = useIntersection({
    rootMargin: '400px 0px',
    threshold: 0,
  });
  const [threadWanted, setThreadWanted] = useState(false);
  useEffect(() => {
    if (nearEntry?.isIntersecting) setThreadWanted(true);
  }, [nearEntry?.isIntersecting]);

  const key = commentKey(blogId, limit);
  const mutation = useMutation({
    // postComment resolves with an ApiResponse instead of throwing, so
    // unwrap-and-throw here to keep onError driving the optimistic rollback.
    mutationFn: async ({
      content,
      parentId,
    }: {
      content: string;
      parentId?: string;
    }) => {
      const res = await postComment(blogId, content, parentId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },

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

    onSuccess: (posted, _vars, ctx) => {
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
                  return posted;
                }

                if (c.children) {
                  return {
                    ...c,
                    children: c.children.map((child) =>
                      child.id === ctx?.tempId ? posted : child
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

  return (
    <div id="comments" className="space-y-6 md:space-y-8">
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

      <div ref={nearRef} className="space-y-2">
        {threadWanted ? (
          <BlogCommentThread
            blogId={blogId}
            limit={limit}
            onComment={(content, parentId) =>
              mutation.mutate({ content, parentId })
            }
            onRequireAuth={() => setIsAuthModalOpen(true)}
          />
        ) : (
          <CommentListSkeleton />
        )}
      </div>
    </div>
  );
}
