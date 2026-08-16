'use client';

import { Button , Skeleton } from '@byte-of-me/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import { EyeOff, Reply } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { hideComment } from '@/entities/comment/api/hide-comment';
import { commentKeys, type PublicComment } from '@/entities/comment/model';
import { getRelativeTime } from '@/shared/lib/utils';

export function CommentItem({
  comment,
  isReply,
  onReply,
}: {
  comment: PublicComment;
  isReply?: boolean;
  onReply?: (comment: PublicComment) => void;
}) {
  const t = useTranslations('blogDetails');
  const locale = useLocale();
  const { data: session } = useSession();

  const isRemovable =
    session?.user?.role === 'ADMIN' || session?.user?.id === comment.user.id;

  const queryClient = useQueryClient();

  const hideMutation = useMutation({
    // hideComment resolves with an ApiResponse instead of throwing, so
    // unwrap-and-throw here to keep onError driving the failure toast.
    mutationFn: async () => {
      const res = await hideComment(comment.id);
      if (!res.success) throw new Error(res.errorMsg);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.threads(comment.blogId),
      });
    },
    onError: () => {
      toast(t('hideCommentFailed'));
    },
  });

  if (hideMutation.isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  return (
    <AnimatePresence>
      <m.div
        id={`comment-${comment.id}`}
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="grid grid-cols-[auto_1fr] gap-x-3"
      >
        {/* AVATAR */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {(comment.user.name || 'Anonymous').slice(0, 2).toUpperCase()}
        </div>

        {/* HEADER */}
        <div className="flex min-w-0 items-center justify-between gap-2">
          {/* Flat `gap-2`: 8px is the "label → value" step and the public
              rhythm keeps anything at or below 8px off the breakpoints, so the
              name/timestamp pair no longer collapses to 0 on narrow screens
              purely because it stacks there. */}
          <div className="flex min-w-0 flex-col gap-2 text-sm md:flex-row md:items-center">
            <span className="truncate font-medium">
              {comment.user.name || 'Anonymous'}
            </span>
            <span className="text-xs text-muted-foreground">
              {getRelativeTime(comment.createdAt, locale)}
            </span>
          </div>

          {isRemovable && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => hideMutation.mutate()}
              disabled={hideMutation.isPending}
              className="h-7 w-7 text-muted-foreground opacity-100 hover:text-red-500 md:opacity-0 md:hover:opacity-100"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="col-span-2 mt-2 flex items-center gap-2 text-sm leading-relaxed text-foreground/90">
          {comment.userReplied && (
            <Link
              href={`#comment-${comment.parentId}`}
              className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-primary/80 transition-colors hover:text-primary"
            >
              @{comment.userReplied}
            </Link>
          )}
          {comment.content}
        </p>

        <div className="col-span-2 mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={!session}
            onClick={() => onReply?.(comment)}
            className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Reply className="mr-1 h-3.5 w-3.5" />
            {t('reply')}
          </Button>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
