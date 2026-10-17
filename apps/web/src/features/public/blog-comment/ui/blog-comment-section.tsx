'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Button, Loading, useIntersection } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

// Narrow import on purpose: the `@/entities` root barrel pulls unrelated
// server-rendering modules (education-item -> RichText -> tiptap) into the
// public bundle, so a client component imports the slice instead.
import {
  CommentForm,
  CommentList,
  CommentListEmpty,
  CommentListSkeleton,
  type PublicComment,
} from '@/entities/comment';
import {
  useCommentInfiniteQuery,
  usePostComment,
} from '@/entities/comment/query';
import { AuthModal } from '@/features/auth/ui/auth-modal';

interface BlogCommentSectionProps {
  blogId: string;
}

export function BlogCommentSection({ blogId }: BlogCommentSectionProps) {
  const t = useTranslations('blogDetails');
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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    refetch,
  } = useCommentInfiniteQuery(blogId, limit, { enabled: threadWanted });

  const { post, isPending: isPosting } = usePostComment(blogId, limit);

  const { ref: moreRef, entry: moreEntry } = useIntersection({
    root: null,
    threshold: 0.1,
  });

  // `isError` stops the sentinel re-requesting a page that just failed: the
  // fetch settling flips `isFetchingNextPage`, which would retry in a loop.
  useEffect(() => {
    if (
      moreEntry?.isIntersecting &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isError
    ) {
      fetchNextPage();
    }
  }, [
    moreEntry?.isIntersecting,
    hasNextPage,
    isFetchingNextPage,
    isError,
    fetchNextPage,
  ]);

  const allComments = useMemo(() => {
    const map = new Map<string, PublicComment>();

    data?.pages.forEach((page) => {
      page.data.forEach((comment) => {
        map.set(comment.id, comment);
      });
    });

    return Array.from(map.values());
  }, [data]);

  const onComment = (content: string, parentId?: string) => {
    void post(content, parentId);
  };
  const onRequireAuth = () => setIsAuthModalOpen(true);

  let thread: ReactNode;
  if (isPending) {
    thread = <CommentListSkeleton />;
  } else if (allComments.length === 0) {
    thread = isError ? (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground"
      >
        <p className="text-sm">{t('loadCommentsFailed')}</p>
        <Button variant="ghost" onClick={() => refetch()}>
          {t('retryLoadComments')}
        </Button>
      </div>
    ) : (
      <CommentListEmpty />
    );
  } else {
    thread = (
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

        {isError && (
          <p
            role="alert"
            className="pt-4 text-center text-sm text-muted-foreground"
          >
            {t('loadCommentsFailed')}
          </p>
        )}

        {hasNextPage && <div ref={moreRef} className="h-4" />}

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

  return (
    <div id="comments" className="space-y-6 md:space-y-8">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <h3 className="text-xl font-bold tracking-tight">{t('comments')}</h3>

      <CommentForm
        blogId={blogId}
        isPending={isPosting}
        onComment={onComment}
        onRequireAuth={onRequireAuth}
      />

      <div ref={nearRef} className="space-y-2">
        {thread}
      </div>
    </div>
  );
}
