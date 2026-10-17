'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

const DEBOUNCE_MS = 1200;

interface StoredDraft<T> {
  savedAt: number;
  values: T;
}

/** Storage can be full, blocked or disabled; autosave is best-effort throughout. */
function tryStorage(action: () => void) {
  try {
    action();
  } catch {
    // Quota exceeded or storage disabled.
  }
}

/** The stored draft, or `null` when there is none or it is not one (it is then removed). */
function readDraft<T>(storageKey: string): StoredDraft<T> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const draft: unknown = JSON.parse(raw);
    if (
      draft &&
      typeof draft === 'object' &&
      typeof (draft as StoredDraft<T>).savedAt === 'number' &&
      (draft as StoredDraft<T>).values &&
      typeof (draft as StoredDraft<T>).values === 'object'
    ) {
      return draft as StoredDraft<T>;
    }
    tryStorage(() => localStorage.removeItem(storageKey));
  } catch {
    tryStorage(() => localStorage.removeItem(storageKey));
  }
  return null;
}

/**
 * Debounced localStorage autosave for a react-hook-form instance; a change still waiting is
 * written on unmount. A snapshot found on mount is exposed as `restorable`, and restoring is
 * the author's call, never automatic: the server copy may be newer.
 */
export function useFormAutosave<T extends FieldValues>(
  form: UseFormReturn<T>,
  storageKey: string
) {
  const [restorable, setRestorable] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The latest values not yet written, so unmounting inside the debounce
  // window still saves them. `clear` and `discard` empty it: a saved or
  // abandoned post must not leave a draft behind.
  const pending = useRef<unknown>(undefined);
  // Snapshots pause until the author decides on the pending draft, otherwise
  // the first keystroke overwrites the very thing they might want back.
  const holdWrites = useRef(false);

  useEffect(() => {
    const draft = readDraft<T>(storageKey);
    if (draft) {
      holdWrites.current = true;
      setRestorable(new Date(draft.savedAt));
    }
  }, [storageKey]);

  useEffect(() => {
    const write = () => {
      clearTimeout(timer.current);
      if (pending.current === undefined) return;
      const draft: StoredDraft<unknown> = {
        savedAt: Date.now(),
        values: pending.current,
      };
      pending.current = undefined;
      tryStorage(() => localStorage.setItem(storageKey, JSON.stringify(draft)));
    };

    const subscription = form.watch((values) => {
      if (holdWrites.current) return;
      pending.current = values;
      clearTimeout(timer.current);
      timer.current = setTimeout(write, DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      write();
    };
  }, [form, storageKey]);

  const forget = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = undefined;
    tryStorage(() => localStorage.removeItem(storageKey));
  }, [storageKey]);

  const restore = useCallback(() => {
    const draft = readDraft<T>(storageKey);
    if (draft) form.reset(draft.values);
    holdWrites.current = false;
    setRestorable(null);
  }, [form, storageKey]);

  const discard = useCallback(() => {
    forget();
    holdWrites.current = false;
    setRestorable(null);
  }, [forget]);

  return { restorable, restore, discard, clear: forget };
}
