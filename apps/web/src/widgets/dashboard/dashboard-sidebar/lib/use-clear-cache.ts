'use client';

import { useCallback, useRef } from 'react';
import { useServerMutation } from '@byte-of-me/query';
import { useTranslations } from 'next-intl';

import { purgeEntireCache } from '@/widgets/dashboard/dashboard-sidebar/lib/purge-entire-cache';

/**
 * Empties every cache, and says so. Shared by the rail and the drawer, so the
 * two buttons cannot drift apart. Never rethrows: a refusal is toasted by the
 * mutation, and a click handler must not reject into the nav bar.
 */
export function useClearCache() {
  const t = useTranslations('dashboard.sidebar');
  // Synchronous, unlike the mutation's pending state: two clicks in one React
  // batch both see `isPending` false, so this ref is what stops a second purge.
  const inFlight = useRef(false);
  const { mutateAsync, isPending } = useServerMutation<void, null>({
    mutationFn: () => purgeEntireCache(),
    errorMessage: t('actions.cacheError'),
    successMessage: t('actions.cacheSuccess'),
  });

  const clearCache = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await mutateAsync();
    } catch {
      // Already toasted by the mutation's onError.
    } finally {
      inFlight.current = false;
    }
  }, [mutateAsync]);

  return { clearCache, isPending };
}
