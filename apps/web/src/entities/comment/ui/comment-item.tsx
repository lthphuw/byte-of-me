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
    onMutate: async () => {
      setIsHidden(true);
    },
    onError: () => {
      setIsHidden(false);
    },
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
        exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
        transition={{ duration: 0.25 }}
        className="group flex gap-4 border-b border-muted py-6 last:border-0"
      >
        {/* Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          {comment.user.email.slice(0, 2).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">
                {comment.user.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            {/* Admin action */}
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className={cn(
                  'opacity-0 transition-opacity group-hover:opacity-100',
                  'h-8 w-8 text-muted-foreground hover:text-red-500'
                )}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-sm leading-relaxed text-foreground/90">
            {comment.content}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
