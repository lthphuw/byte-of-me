'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { OutlineItem } from '@byte-of-me/ui/rich-text-editor';

/**
 * The open note's heading outline, held OUTSIDE React's render path.
 *
 * TipTap's `TableOfContents` extension fires `onUpdate` on every transaction
 * that changed the document — i.e. on every keystroke. While the outline was
 * `useState` at the widget root, each of those keystrokes re-rendered the whole
 * workspace: the explorer tree and every row in it, both command palettes, the
 * editor. The only thing that actually reads an outline is the sidebar's
 * Contents tab.
 *
 * A store rather than a context, because a context still re-renders the
 * PROVIDER's subtree on every change; here only the component that calls
 * `useNoteOutline` subscribes. `set` is stable for the life of the store, so
 * handing it to the editor as `onOutlineChange` costs nothing either.
 */
export interface NoteOutlineStore {
  subscribe: (listener: () => void) => () => void;
  get: () => OutlineItem[];
  set: (items: OutlineItem[]) => void;
}

/** Shared identity for "no headings", so clearing twice notifies nobody. */
const EMPTY: OutlineItem[] = [];

function createNoteOutlineStore(): NoteOutlineStore {
  let items: OutlineItem[] = EMPTY;
  const listeners = new Set<() => void>();

  return {
    get: () => items,
    set: (next) => {
      // A note with no headings reports `[]` on every keystroke, and a fresh
      // array each time would wake the subscriber for a change that is not one.
      if (items === next || (items.length === 0 && next.length === 0)) return;
      items = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** One store per workspace mount. */
export function useNoteOutlineStore(): NoteOutlineStore {
  const storeRef = useRef<NoteOutlineStore | null>(null);
  storeRef.current ??= createNoteOutlineStore();
  return storeRef.current;
}

/** Subscribes to the outline. `EMPTY` on the server — nothing has reported yet. */
export function useNoteOutline(store: NoteOutlineStore): OutlineItem[] {
  const getServerSnapshot = useCallback(() => EMPTY, []);
  return useSyncExternalStore(store.subscribe, store.get, getServerSnapshot);
}
