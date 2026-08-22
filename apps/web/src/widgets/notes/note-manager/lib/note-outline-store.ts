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

/**
 * Whether two reports describe the same outline — by VALUE, because identity
 * is never going to say so.
 *
 * The extension rebuilds the whole array, with a fresh object per heading, on
 * every `docChanged` transaction. Typing a word into a paragraph of the
 * 3,797-node research note therefore re-reported all 75 of its headings
 * unchanged, and the reference check below could not tell that from a real
 * edit: the Contents tab re-rendered 75 heading buttons per keystroke. The
 * empty case was the only one the old guard caught.
 *
 * Four fields is the WHOLE of `OutlineItem`, so comparing them is comparing
 * the value — nothing an outline can express is missed here.
 */
function isSameOutline(a: OutlineItem[], b: OutlineItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  return a.every((item, index) => {
    const other = b[index];
    return (
      item.id === other.id &&
      item.level === other.level &&
      item.text === other.text &&
      item.isActive === other.isActive
    );
  });
}

function createNoteOutlineStore(): NoteOutlineStore {
  let items: OutlineItem[] = EMPTY;
  const listeners = new Set<() => void>();

  return {
    get: () => items,
    set: (next) => {
      // The store's contract: wake nobody for a change that is not one. A note
      // with no headings reports `[]` on every keystroke, and one full of them
      // reports the same 75 in a new array — neither is a change.
      //
      // The unchanged report is DROPPED rather than adopted. `get` has to stay
      // reference-stable between notifications or `useSyncExternalStore` sees a
      // new snapshot it was never told about, and re-renders in a loop trying
      // to settle on one.
      if (isSameOutline(items, next)) return;
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
