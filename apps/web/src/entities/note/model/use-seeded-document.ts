'use client';

import { useCallback, useState } from 'react';
import { toEditorContent } from '@byte-of-me/ui/lib/rich-text-content';

/** A parsed document, plus the counter that makes the editor take it. */
export interface SeededDocument {
  /**
   * The document already parsed into the shape the rich-text editor wants.
   *
   * Parsed once per seed rather than once per render. Computing it inline as
   * `toEditorContent(content)` means a `JSON.parse` of the WHOLE document on
   * every keystroke, for a prop the editor reads only when it mounts.
   * Measured on a realistic Tiptap document: 0.07ms at 21KB, 0.27ms at 83KB,
   * 1.08ms at 334KB.
   *
   * `ReturnType<typeof toEditorContent>` rather than tiptap's `Content`: that
   * type lives in `@tiptap/core`, which this app does not depend on directly.
   */
  value: ReturnType<typeof toEditorContent>;
  /**
   * Changes on every reseed, and is what the editor is keyed on. Tiptap reads
   * its initial content once, at mount, so replacing the document a user is
   * looking at requires remounting the editor — there is no prop to change.
   */
  generation: number;
  /** Replace the document on screen, and make the editor take it. */
  reseed: (content: string) => void;
}

/**
 * Holds the document an editor was seeded with, and the generation counter
 * that forces it to accept a new one.
 *
 * The two must move together, always. A generation bumped without a fresh
 * value remounts the editor onto the PREVIOUS document — the author watches
 * their note revert — and a value replaced without a bump changes a prop
 * Tiptap has already read and will never read again, so nothing happens at
 * all. Both surfaces that seed an editor had that pairing open-coded, five
 * call sites between them, each one remembering the invariant on its own.
 * Here it is the only thing `reseed` can do.
 *
 * The initial content is read once. Both callers rely on that: the owner's
 * editor starts empty and seeds from the query cache in an effect, while the
 * shared surface has the document in props from the first render and must not
 * re-parse it on every one.
 */
export function useSeededDocument(initialContent = ''): SeededDocument {
  const [value, setValue] = useState<ReturnType<typeof toEditorContent>>(() =>
    toEditorContent(initialContent)
  );
  const [generation, setGeneration] = useState(0);

  const reseed = useCallback((content: string) => {
    setValue(toEditorContent(content));
    setGeneration((current) => current + 1);
  }, []);

  return { value, generation, reseed };
}
