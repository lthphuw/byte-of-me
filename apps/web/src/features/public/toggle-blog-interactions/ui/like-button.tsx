'use client';

import { useState } from 'react';
import { Button, motionDuration, motionEase } from '@byte-of-me/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { blogKeys } from '@/entities/blog/model/query-keys';
import { AuthModal } from '@/features/auth/ui/auth-modal';
import {
  getBlogInteractionsForUser,
  toggleBlogInteraction,
} from '@/features/public/toggle-blog-interactions/lib';
import { INTERACTION } from '@/shared/lib/constants';
import { cn } from '@/shared/lib/utils';

// A tween on purpose: framer's default for x/y is a spring with ~0.45 bounce,
// past the 0.2 ceiling for a toggle. The fade takes a gentler curve so the
// dots do not vanish before they land.
const BURST_TRANSITION = {
  duration: motionDuration.base,
  ease: motionEase.out,
  opacity: { duration: motionDuration.base, ease: 'easeOut' },
} as const;

export function LikeButton({
  blogId,
  blogSlug,
  initialData,
}: {
  blogId: string;
  blogSlug: string;
  initialData: { isInteracted: boolean; count: number };
}) {
  const t = useTranslations('blogDetails');
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { data } = useQuery({
    queryKey: blogKeys.like(blogId),
    queryFn: () => getBlogInteractionsForUser(blogId, INTERACTION.LIKE),
    enabled: !!session,
    initialData,
  });

  const { isInteracted, count } = data;

  const mutation = useMutation({
    // The action resolves with an ApiResponse instead of throwing, so
    // unwrap-and-throw here to keep onError driving the optimistic rollback.
    mutationFn: async () => {
      const res = await toggleBlogInteraction(
        blogId,
        blogSlug,
        INTERACTION.LIKE
      );
      if (!res.success) throw new Error(res.errorMsg);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: blogKeys.like(blogId) });
      const prev = queryClient.getQueryData<{
        isInteracted: boolean;
        count: number;
      }>(blogKeys.like(blogId));
      queryClient.setQueryData<{ isInteracted: boolean; count: number }>(
        blogKeys.like(blogId),
        (old) =>
          old
            ? {
                isInteracted: !old.isInteracted,
                count: old.isInteracted ? old.count - 1 : old.count + 1,
              }
            : old
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(blogKeys.like(blogId), ctx?.prev);
      toast(t('interactFailed'));
    },
    // Reconcile the optimistic count (and the live stats row) with the server
    // regardless of outcome.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.like(blogId) });
      queryClient.invalidateQueries({ queryKey: blogKeys.stats(blogId) });
    },
  });

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => (session ? mutation.mutate() : setIsAuthModalOpen(true))}
        disabled={mutation.isPending}
        className={cn(
          'px-0 group gap-2 hover:bg-transparent',
          isInteracted && 'text-red-500'
        )}
      >
        <div className="relative flex h-6 w-6 items-center justify-center">
          <AnimatePresence initial={false}>
            {isInteracted && (
              <>
                <m.div
                  initial={{ scale: 0.95, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{
                    opacity: 0,
                    transition: {
                      duration: motionDuration.fast,
                      ease: motionEase.in,
                    },
                  }}
                  transition={BURST_TRANSITION}
                  className="absolute h-full w-full rounded-full bg-red-500/30"
                />
                {[...Array(6)].map((_, i) => (
                  <m.span
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.95 }}
                    animate={{
                      x: (i - 2.5) * 8,
                      y: -Math.abs(i - 2.5) * 6,
                      opacity: 0,
                      scale: 1.2,
                    }}
                    transition={BURST_TRANSITION}
                    className="absolute h-1.5 w-1.5 rounded-full bg-red-500"
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          <m.div
            animate={{ scale: isInteracted ? [1, 1.3, 1] : 1 }}
            initial={false}
            transition={{ duration: motionDuration.base }}
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                isInteracted ? 'fill-red-500 stroke-red-500' : 'stroke-current'
              )}
            />
          </m.div>
        </div>
        <span className="font-medium">{count}</span>
      </Button>
    </>
  );
}
