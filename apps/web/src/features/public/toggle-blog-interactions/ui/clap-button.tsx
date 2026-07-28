'use client';

import { useState } from 'react';
import { Button , Icons } from '@byte-of-me/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { blogKeys } from '@/entities/blog/model/query-keys';
import { AuthModal } from '@/features/auth';
import {
  getBlogInteractionsForUser,
  toggleBlogInteraction,
} from '@/features/public/toggle-blog-interactions/lib';
import { INTERACTION } from '@/shared/lib/constants';
import { cn } from '@/shared/lib/utils';

export function ClapButton({
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
    queryKey: blogKeys.clap(blogId),
    queryFn: () => getBlogInteractionsForUser(blogId, INTERACTION.CLAP),
    enabled: !!session,
    initialData,
  });

  const { isInteracted: isClapped, count = 0 } = data;

  const mutation = useMutation({
    // The action resolves with an ApiResponse instead of throwing, so
    // unwrap-and-throw here to keep onError driving the optimistic rollback.
    mutationFn: async () => {
      const res = await toggleBlogInteraction(
        blogId,
        blogSlug,
        INTERACTION.CLAP
      );
      if (!res.success) throw new Error(res.errorMsg);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: blogKeys.clap(blogId) });
      const prev = queryClient.getQueryData<{
        isInteracted: boolean;
        count: number;
      }>(blogKeys.clap(blogId));
      queryClient.setQueryData<{ isInteracted: boolean; count: number }>(
        blogKeys.clap(blogId),
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
      queryClient.setQueryData(blogKeys.clap(blogId), ctx?.prev);
      toast(t('interactFailed'));
    },
    // Reconcile the optimistic count (and the live stats row) with the server
    // regardless of outcome.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.clap(blogId) });
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
          isClapped && 'text-amber-500'
        )}
      >
        <div className="relative flex h-6 w-6 items-center justify-center">
          <AnimatePresence>
            {isClapped && (
              <>
                <m.div
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute h-full w-full rounded-full bg-amber-500/30"
                />
                {[...Array(6)].map((_, i) => (
                  <m.span
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.8 }}
                    animate={{
                      x: (i - 2.5) * 8,
                      y: -Math.abs(i - 2.5) * 6,
                      opacity: 0,
                      scale: 1.2,
                    }}
                    className="absolute h-1.5 w-1.5 rounded-full bg-amber-500"
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          <m.div
            animate={{ scale: isClapped ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Icons.clap
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                isClapped ? 'fill-amber-500 stroke-amber-500' : 'stroke-current'
              )}
            />
          </m.div>
        </div>
        <span className="font-medium">{count}</span>
      </Button>
    </>
  );
}
