'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { Editor } from '@tiptap/core';

/**
 * The open note's live editor, held OUTSIDE React's render path — the same
 * discipline, and for the same reason, as `note-outline-store.ts`.
 *
 * The References panel needs the editor instance, and the only place it can be
 * mounted is the workspace sidebar: the notes editor runs `chromeless`, so the
 * References aside that `packages/ui` renders for the blog form never appears.
 * Putting the instance in workspace state instead would re-render the explorer
 * tree, both command palettes and the editor every time a note is opened or
 * closed, to tell one leaf in the sidebar something it alone reads.
 */
export interface NoteEditorStore {
  subscribe: (listener: () => void) => () => void;
  get: () => Editor | null;
  set: (editor: Editor | null) => void;
}

function createNoteEditorStore(): NoteEditorStore {
  let editor: Editor | null = null;
  const listeners = new Set<() => void>();

  return {
    get: () => editor,
    set: (next) => {
      if (editor === next) return;
      editor = next;
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
export function useNoteEditorStore(): NoteEditorStore {
  const storeRef = useRef<NoteEditorStore | null>(null);
  storeRef.current ??= createNoteEditorStore();
  return storeRef.current;
}

/** Subscribes to the live editor. `null` on the server — nothing has mounted. */
export function useNoteEditor(store: NoteEditorStore): Editor | null {
  return useSyncExternalStore(
    store.subscribe,
    store.get,
    useCallback(() => null, [])
  );
}
