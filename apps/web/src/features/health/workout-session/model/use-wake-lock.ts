'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Keeps the screen awake while a workout is open.
 *
 * A phone locks after thirty seconds on the bench. Every unlock between sets
 * is a face-ID prompt, a passcode with chalky hands, and a re-find of the
 * place on the page — which is how a logger that works perfectly ends up
 * unused. `navigator.wakeLock` (iOS 16.4+, Chrome/Edge/Android since 2020) is
 * the platform's answer.
 *
 * **Feature-detected, and silent when absent.** Firefox on Android has no wake
 * lock; nor does an older iOS. There is nothing to tell the reader — the
 * screen behaving as it always has is not an error state, and a warning about
 * an API name is noise on a screen being read between sets.
 *
 * **Re-acquired on return, because the browser releases it for us.** The spec
 * drops the lock whenever the document stops being visible, and it does not
 * come back on its own: without the `visibilitychange` half, one glance at a
 * notification would silently disable the feature for the rest of the workout.
 *
 * The sentinel is held in a ref rather than state: nothing renders from it,
 * and re-rendering the whole logger because a lock was regranted would be a
 * render nobody asked for. `isActive` is the one bit a caller may want — the
 * header prints it, so the reader can tell "the screen will stay on" from "it
 * will not", which is the difference between putting the phone down and not.
 */
export function useWakeLock(enabled: boolean): { isActive: boolean } {
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const [isActive, setActive] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // `in` rather than a truthy check: lib.dom types `wakeLock` as always
    // present on `Navigator`, so the property access compiles either way and
    // only the runtime knows the truth.
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    // Guards the whole effect's async tail: a request in flight when the
    // component unmounts must not install a sentinel nobody will release.
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || sentinel.current) return;

      try {
        const lock = await navigator.wakeLock.request('screen');

        if (cancelled) {
          void lock.release().catch(() => undefined);
          return;
        }

        sentinel.current = lock;
        setActive(true);
        // Fires both when the browser drops it (tab hidden, battery saver) and
        // when we release it ourselves, so the flag can never claim a lock
        // that is gone.
        lock.addEventListener('release', () => {
          sentinel.current = null;
          setActive(false);
        });
      } catch {
        // A `NotAllowedError` is the documented answer for a hidden document
        // or a battery-saver mode. Nothing to report: the screen simply
        // behaves the way it does without this feature.
        setActive(false);
      }
    };

    const release = () => {
      const lock = sentinel.current;
      sentinel.current = null;
      setActive(false);
      if (lock) void lock.release().catch(() => undefined);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      } else {
        // Already released by the browser at this point; this keeps our own
        // bookkeeping honest so the next return re-acquires rather than
        // believing it still holds one.
        release();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      release();
    };
  }, [enabled]);

  return { isActive };
}
