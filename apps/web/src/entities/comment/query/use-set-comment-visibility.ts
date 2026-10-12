'use client';

import { useTranslations } from 'next-intl';

import { setCommentVisibility } from '@/entities/comment/api/set-comment-visibility';
import { commentKeys } from '@/entities/comment/model/query-keys';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';

/**
 * Admin hide and unhide. The caller shows its own success toast and closes its
 * dialog from `onSuccess`, which runs only after the envelope passed.
 */
export function useSetCommentVisibility() {
  const t = useTranslations('dashboard.comment');

  return useServerMutation({
    mutationFn: ({ commentId, hidden }: { commentId: string; hidden: boolean }) =>
      setCommentVisibility(commentId, hidden),
    errorMessage: t('toast.updateError'),
    invalidate: [commentKeys.adminAll()],
  });
}
