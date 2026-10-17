'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Editor, JSONContent } from '@tiptap/react';

/**
 * Trailing delay before an author edit reaches `onChange`: `onChange` lands in
 * react-hook-form, which deep-clones the whole form per call. Blur, unmount and
 * a form submit flush it early, so no edit waits past the next chance to read it.
 */
const CHANGE_DEBOUNCE_MS = 200;

/**
 * `initial`: the EDITOR produced this document while opening (TOC heading ids from `onCreate`),
 * not the author. The JSON cannot say, nor "skip the first emit" (no rewrite means no emit).
 * Autosave checks it; a form wanting the normalised document ignores it.
 */
export interface RichTextChangeMeta {
  initial: boolean;
}

type RichTextChangeHandler = (
  value: JSONContent,
  meta: RichTextChangeMeta
) => void;

/**
 * Coalesces edits into one `onChange` and says which kind each report is.
 * `onUpdate` goes to `useEditor`; `flush` is its `onBlur` and the submit hook's.
 */
export function useDebouncedChange(
  onChange: RichTextChangeHandler | undefined
) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEditor = useRef<Editor | null>(null);

  // The document is read when the timer fires, never a stale one per keystroke.
  const flush = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;

    const editor = pendingEditor.current;
    if (!editor || editor.isDestroyed) return;
    onChangeRef.current?.(editor.getJSON(), { initial: false });
  }, []);

  const onUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      // `isInitialized` is set right after `create` is emitted, and the `onCreate` handlers
      // that rewrite the document run inside that emit: false only for updates the editor
      // caused while opening.
      if (!editor.isInitialized) {
        onChangeRef.current?.(editor.getJSON(), { initial: true });
        return;
      }

      pendingEditor.current = editor;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, CHANGE_DEBOUNCE_MS);
    },
    [flush]
  );

  // Unmount: a pending edit still reaches `onChange`.
  useEffect(() => flush, [flush]);

  return { onUpdate, flush };
}

/**
 * Blur precedes a click on Save, but not `requestSubmit()` or a button Safari
 * never focuses. Capture phase, so it lands before react-hook-form reads values.
 */
export function useFlushBeforeSubmit(editor: Editor | null, flush: () => void) {
  useEffect(() => {
    if (!editor) return;

    const flushBeforeSubmit = ({ target }: Event) => {
      if (editor.isDestroyed) return;
      if (target instanceof Node && target.contains(editor.view.dom)) flush();
    };
    document.addEventListener('submit', flushBeforeSubmit, true);
    return () =>
      document.removeEventListener('submit', flushBeforeSubmit, true);
  }, [editor, flush]);
}
