'use client';

import { useEffect, useRef } from 'react';
import { FileText, Folder } from 'lucide-react';

import {
  NOTE_ROW_CHEVRON_CLASS,
  NOTE_ROW_CLASS,
  NOTE_ROW_ICON_CLASS,
  noteRowIndent,
} from '@/entities/note/ui/note-row-shell';
import { cn } from '@/shared/lib/utils';

interface NoteRowInputProps {
  /** Indent level, so the input sits in the column its row would. */
  depth: number;
  /** Picks the icon; a draft row also uses it to choose the placeholder. */
  isFolder: boolean;
  /** Pre-filled for a rename, empty for a draft. */
  defaultValue?: string;
  /** Accessible name — there is no visible label at this size. */
  label: string;
  /** Called with the raw value; the caller trims and decides what empty means. */
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

/**
 * A tree row that is currently a text field: the draft row a new note starts
 * as, and the in-place rename that replaced the rename dialog.
 *
 * One component for both because they differ only in what they are seeded with.
 * The dialog they replace could not do either job well — it took the author out
 * of the tree to name something whose place in the tree was the point, and it
 * only ever existed for folders, so notes had to be created and then renamed
 * from the editor.
 *
 * Commit-on-blur is VSCode's behaviour and it is what makes the draft row feel
 * like typing a filename rather than filling in a form. It also means this row
 * has TWO ways to finish, and `resolvedRef` is what stops them both running.
 *
 * Enter is the case that actually bit: submitting clears the draft, React
 * unmounts this input, and removing a focused element fires `blur` — which then
 * committed the very same text a second time. Measured in the running app, one
 * Enter produced two `createNote` calls, two notes, and two competing
 * `router.push`es that left the editor showing a skeleton for a note the URL had
 * already moved off. Escape needs the same guard for the same reason: cancelling
 * moves focus, and the blur that follows must not save what was just rejected.
 */
export function NoteRowInput({
  depth,
  isFolder,
  defaultValue = '',
  label,
  onSubmit,
  onCancel,
}: NoteRowInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Set once this row has finished, by EITHER path. See the note above. */
  const resolvedRef = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Selected, not just focused: a rename almost always replaces the name
    // outright, and a draft has nothing to select anyway.
    input.select();
  }, []);

  return (
    <div className={cn(NOTE_ROW_CLASS, 'text-foreground')} style={noteRowIndent(depth)}>
      {/* An empty box where the chevron would be, so the icon and the text
          land in the same columns as every other row's. */}
      <span className={NOTE_ROW_CHEVRON_CLASS} aria-hidden />

      {isFolder ? (
        <Folder className={NOTE_ROW_ICON_CLASS} />
      ) : (
        <FileText className={NOTE_ROW_ICON_CLASS} />
      )}

      <input
        ref={inputRef}
        type="text"
        aria-label={label}
        defaultValue={defaultValue}
        maxLength={200}
        className="min-w-0 flex-1 rounded-sm border border-input bg-background px-1 py-0.5 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (resolvedRef.current) return;
            resolvedRef.current = true;
            onSubmit(event.currentTarget.value);
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            if (resolvedRef.current) return;
            resolvedRef.current = true;
            onCancel();
            return;
          }
          // Every other key stays here. Without this the panel's tree
          // bindings would fire while the author is typing a name — `n` would
          // open a second draft, `Delete` would archive the selected row, and
          // the arrow keys would move the selection out from under the input
          // instead of moving the caret.
          event.stopPropagation();
        }}
        onBlur={(event) => {
          if (resolvedRef.current) return;
          resolvedRef.current = true;
          onSubmit(event.currentTarget.value);
        }}
      />
    </div>
  );
}
