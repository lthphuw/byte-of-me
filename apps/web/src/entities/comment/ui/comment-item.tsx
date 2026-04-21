'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { hideComment } from '@/entities';
import type { PublicComment } from '@/entities/comment/model';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { cn, formatDate } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

export function CommentItem({ comment }: { comment: PublicComment }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const queryClient = useQueryClient();
  const [isHidden, setIsHidden] = useState(false);

  const mutation = useMutation({
    mutationFn: () => hideComment(comment.id),
    onMutate: () => setIsHidden(true),
    onError: () => setIsHidden(false),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CACHE_TAGS.COMMENT, comment.blogId],
      });
    },
  });

  if (isHidden) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="group flex gap-3 border-b border-muted py-6 last:border-0"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {comment.user.email.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold tracking-tight">
                {comment.user.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className={cn(
                  'shrink-0 h-8 w-8 text-muted-foreground hover:text-red-500',
                  'md:opacity-0 md:group-hover:opacity-100'
                )}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="mt-2 break-words text-sm leading-relaxed text-foreground/90">
            {comment.content}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
