'use client';

import { useEffect } from 'react';

/**
 * Runs `flush` at every moment a debounced buffer would otherwise be thrown
 * away without a later render to catch it.
 *
 * Four departures, and no single browser event covers them:
 *
 *  - the key changing (a different note opening in a surviving component),
 *  - the component unmounting outright — no render follows at all, so an
 *    effect that only compares state across renders never fires again,
 *  - `pagehide`, for a same-tab navigation that retires the page while it
 *    still reports itself `visible`,
 *  - `visibilitychange`, which is the one that actually fires when a phone
 *    OS discards a backgrounded tab. `beforeunload` is skipped outright
 *    there, which is exactly where this loss is most likely.
 *
 * Several may fire for one departure, and that is deliberate: `flush` is
 * required to be idempotent (send nothing when the buffer already equals
 * what was sent), so a duplicate costs a comparison and the alternative
 * costs the author their work. If it is unclear whether a flush is needed,
 * flush.
 *
 * `flush` must be referentially stable — a `useCallback` that does not change
 * per keystroke — or both effects tear down and re-arm on every render.
 *
 * Extracted from `use-note-editor-autosave.ts`, which owned both effects
 * before the shared note surface needed the identical guarantee. Two copies
 * of this is precisely the duplication that lets one of them silently lose
 * the `pagehide` half.
 */
export function useDepartureFlush(
  key: string,
  flush: (departingKey: string) => void
): void {
  // Keyed only on `key`, so the cleanup runs on exactly the two React
  // transitions: switching to a different key, and unmounting.
  useEffect(() => {
    const departingKey = key;
    return () => flush(departingKey);
  }, [key, flush]);

  useEffect(() => {
    const onLeaving = (event: Event) => {
      // The visibility test applies to `visibilitychange` ONLY, which fires
      // for becoming visible again too — coming back to the tab must not
      // send. `pagehide` gets no such test on purpose: it only ever means the
      // page is being retired, and on a same-tab navigation it can fire while
      // the document still reports itself `visible`, so sharing the guard
      // would skip exactly the case `pagehide` was added for.
      if (
        event.type === 'visibilitychange' &&
        document.visibilityState === 'visible'
      ) {
        return;
      }
      flush(key);
    };

    document.addEventListener('visibilitychange', onLeaving);
    window.addEventListener('pagehide', onLeaving);
    return () => {
      document.removeEventListener('visibilitychange', onLeaving);
      window.removeEventListener('pagehide', onLeaving);
    };
  }, [key, flush]);
}
