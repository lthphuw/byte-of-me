'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

const DEBOUNCE_MS = 1200;

interface StoredDraft<T> {
  savedAt: number;
  values: T;
}

/**
 * Debounced localStorage autosave for a react-hook-form instance.
 *
 * Losing a half-written post to a closed dialog is the worst failure a CMS
 * can have, so every change is snapshotted per storage key. If a snapshot
 * exists on mount, `restorable` exposes its timestamp and the caller renders
 * a restore banner — restoring is always the author's decision, never
 * automatic, because the snapshot may be older than what the server has.
 */
export function useFormAutosave<T extends FieldValues>(
  form: UseFormReturn<T>,
  storageKey: string
) {
  const [restorable, setRestorable] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Snapshots pause until the author decides on the pending draft, otherwise
  // the first keystroke overwrites the very thing they might want back.
  const holdWrites = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as StoredDraft<T>;
        holdWrites.current = true;
        setRestorable(new Date(draft.savedAt));
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (holdWrites.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          const draft: StoredDraft<unknown> = {
            savedAt: Date.now(),
            values,
          };
          localStorage.setItem(storageKey, JSON.stringify(draft));
        } catch {
          // Quota exceeded or storage disabled — autosave is best-effort.
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer.current);
    };
  }, [form, storageKey]);

  const restore = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as StoredDraft<T>;
        form.reset(draft.values);
      }
    } catch {
      // Corrupt snapshot: nothing to restore.
    }
    holdWrites.current = false;
    setRestorable(null);
  }, [form, storageKey]);

  const discard = useCallback(() => {
    localStorage.removeItem(storageKey);
    holdWrites.current = false;
    setRestorable(null);
  }, [storageKey]);

  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { restorable, restore, discard, clear };
}
