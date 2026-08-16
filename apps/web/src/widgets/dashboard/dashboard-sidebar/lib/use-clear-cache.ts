'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { purgeEntireCache } from '@/widgets/dashboard/dashboard-sidebar/lib/purge-entire-cache';

/**
 * Empties every cache, and says so.
 *
 * A hook rather than a function because the two messages are translated, and
 * a hook rather than a copy in each caller because the rail and the drawer
 * both offer this action and a half-updated pair of toasts is exactly the sort
 * of thing that survives review.
 *
 * Never rethrows: this is a maintenance button, and an unhandled rejection
 * from a click handler in a nav bar takes the whole screen down in dev.
 */
export function useClearCache() {
  const t = useTranslations('dashboard.sidebar');

  return useCallback(async () => {
    try {
      await purgeEntireCache();
      toast(t('actions.cacheSuccess'), {
        description: t('actions.cacheSuccessDesc'),
      });
    } catch {
      toast.error(t('actions.cacheError'), {
        description: t('actions.cacheErrorDesc'),
      });
    }
  }, [t]);
}
