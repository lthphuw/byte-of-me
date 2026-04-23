'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { EyeOff, Reply } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';

import { hideComment } from '@/entities';
import type { PublicComment } from '@/entities/comment/model';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getRelativeTime } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

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
    mutationFn: () => hideComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CACHE_TAGS.COMMENT, comment.blogId],
      });
    },
  });

  if (hideMutation.isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  return (
    <AnimatePresence>
      <motion.div
        id={`comment-${comment.id}`}
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="grid grid-cols-[auto_1fr] gap-x-3"
      >
        {/* AVATAR */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {comment.user.email.slice(0, 2).toUpperCase()}
        </div>

        {/* HEADER */}
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0 text-sm md:flex-row md:items-center md:gap-2">
            <span className="truncate font-medium">
              {comment.user.name ?? comment.user.email}
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

        <p className="col-span-2 mt-2 flex items-center gap-1 text-sm leading-relaxed text-foreground/90">
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

        <div className="col-span-2 mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={!session}
            onClick={() => onReply?.(comment)}
            className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground"
          >
            <Reply className="mr-1 h-3.5 w-3.5" />
            {t('reply')}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
