'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { AuthModal } from '@/features/auth';
import {
  getBlogInteractionsForUser,
  toggleBlogInteraction,
} from '@/features/public';
import { useToast } from '@/shared/hooks/use-toast';
import { INTERACTION } from '@/shared/lib/constants';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';

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
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ['blog-clap', blogId],
    queryFn: () => getBlogInteractionsForUser(blogId, INTERACTION.CLAP),
    enabled: !!session,
    initialData,
  });

  const { isInteracted: isClapped, count = 0 } = data;

  const mutation = useMutation({
    mutationFn: () => toggleBlogInteraction(blogId, blogSlug, INTERACTION.CLAP),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['blog-clap', blogId] });
      const prev = queryClient.getQueryData(['blog-clap', blogId]);
      queryClient.setQueryData(['blog-clap', blogId], (old: Any) => ({
        isInteracted: !old.isInteracted,
        count: old.isInteracted ? old.count - 1 : old.count + 1,
      }));
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(['blog-clap', blogId], ctx?.prev);
      toast({ title: t('interactFailed') });
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
          'group gap-2 hover:bg-transparent',
          isClapped && 'text-amber-500'
        )}
      >
        <div className="relative flex h-6 w-6 items-center justify-center">
          <AnimatePresence>
            {isClapped && (
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute h-full w-full rounded-full bg-amber-500/30"
                />
                {[...Array(6)].map((_, i) => (
                  <motion.span
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

          <motion.div
            animate={{ scale: isClapped ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Icons.clap
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                isClapped ? 'fill-amber-500 stroke-amber-500' : 'stroke-current'
              )}
            />
          </motion.div>
        </div>
        <span className="font-medium">{count}</span>
      </Button>
    </>
  );
}
