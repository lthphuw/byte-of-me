'use client';

import type { INTERACTION } from '@byte-of-me/api-core';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import type { BlogInteractionState } from '@/entities/blog/api/get-blog-interactions-for-user';
import { toggleBlogInteraction } from '@/entities/blog/api/toggle-blog-interaction';
import { blogKeys } from '@/entities/blog/model/query-keys';
import { useBlogInteractionState } from '@/entities/blog/query';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';

export type UseBlogInteractionOptions = {
  blogId: string;
  blogSlug: string;
  kind: INTERACTION;
  /** The server's read. Absent when that read failed: the count is then read here. */
  seed?: BlogInteractionState;
};

/**
 * One like or clap on a post: the count and the reader's own state, a toggle
 * with an optimistic count that is rolled back if the server refuses it.
 */
export function useBlogInteraction({
  blogId,
  blogSlug,
  kind,
  seed,
}: UseBlogInteractionOptions) {
  const t = useTranslations('blogDetails');
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const key = blogKeys.interaction(blogId, kind);

  const query = useBlogInteractionState({
    blogId,
    kind,
    seed,
    // A seeded reader who is signed out has no personal state to fetch. Without
    // a seed the count still has to be read, so the query runs for everyone.
    enabled: !!session || seed === undefined,
  });

  const mutation = useServerMutation<void, null>({
    mutationFn: () => toggleBlogInteraction(blogId, blogSlug, kind),
    errorMessage: t('interactFailed'),
    invalidate: [blogKeys.stats(blogId)],
  });

  const toggle = async () => {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<BlogInteractionState>(key);

    queryClient.setQueryData<BlogInteractionState>(key, (old) =>
      old
        ? {
            isInteracted: !old.isInteracted,
            count: old.isInteracted ? old.count - 1 : old.count + 1,
          }
        : old
    );

    // `mutateAsync`, not per-call `mutate` callbacks: those belong to the
    // observer's latest call and are dropped if another toggle starts first.
    try {
      await mutation.mutateAsync(undefined);
    } catch {
      // The refusal is already reported by `useServerMutation`; undo the count.
      queryClient.setQueryData(key, previous);
    } finally {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };

  return {
    /** False until a read (seeded or fetched) has produced a count. */
    hasData: query.data !== undefined,
    isError: query.isError,
    isInteracted: query.data?.isInteracted ?? false,
    count: query.data?.count ?? 0,
    isToggling: mutation.isPending,
    retry: () => {
      void query.refetch();
    },
    toggle,
  };
}
