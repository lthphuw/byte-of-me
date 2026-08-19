'use client';

import { useCallback, useRef, useState } from 'react';
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
 *
 * Returns `isPending` because the callers own the only feedback this action
 * has. `revalidatePath('/', 'layout')` is not instant, and the button used to
 * be a bare `void clearCache()` with nothing to show for it: the click looked
 * identical to no click, so the obvious response was to press it again and
 * start a second full purge. The flag is what lets the button disable itself
 * and spin.
 */
export function useClearCache() {
  const t = useTranslations('dashboard.sidebar');
  const [isPending, setIsPending] = useState(false);
  // The guard that actually holds. `isPending` is state, so two clicks inside
  // one React batch both read `false` — the ref is written synchronously and
  // is what makes a second purge impossible rather than merely unlikely.
  const inFlight = useRef(false);

  const clearCache = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsPending(true);
    try {
      // `purgeEntireCache` CATCHES its own failures and reports them in the
      // envelope, so it almost never rejects — which meant the `catch` below
      // was unreachable and a failed purge toasted "System updated". The
      // envelope is the failure path; the catch is only for a transport error.
      const res = await purgeEntireCache();
      if (!res.success) throw new Error(res.errorMsg);
      toast(t('actions.cacheSuccess'), {
        description: t('actions.cacheSuccessDesc'),
      });
    } catch {
      toast.error(t('actions.cacheError'), {
        description: t('actions.cacheErrorDesc'),
      });
    } finally {
      inFlight.current = false;
      setIsPending(false);
    }
  }, [t]);

  return { clearCache, isPending };
}
