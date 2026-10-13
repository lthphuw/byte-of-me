'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { setCommentVisibility } from '@/entities/comment/api/set-comment-visibility';
import { commentKeys } from '@/entities/comment/model/query-keys';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';

/**
 * Admin hide and restore, immediate and reversible, so there is no confirmation.
 * Each outcome is toasted here, from the envelope check, not by the caller.
 */
export function useSetCommentVisibility() {
  const t = useTranslations('dashboard.comment');

  return useServerMutation({
    mutationFn: ({
      commentId,
      hidden,
    }: {
      commentId: string;
      hidden: boolean;
    }) => setCommentVisibility(commentId, hidden),
    errorMessage: t('toast.updateError'),
    invalidate: [commentKeys.all],
    onSuccess: (_data, { hidden }) =>
      toast.success(hidden ? t('toast.hidden') : t('toast.restored')),
  });
}
