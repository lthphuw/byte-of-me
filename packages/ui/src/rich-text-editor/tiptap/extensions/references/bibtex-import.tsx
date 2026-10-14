'use client';

import * as React from 'react';
import type { Editor } from '@tiptap/core';
import { AlertTriangle, ClipboardPaste, X } from 'lucide-react';

import { Button } from '../../../../button';
import { Textarea } from '../../../../textarea';
import type { EditorLabels } from '../../editor-labels';

import { parseBibtex } from './bibtex';
import { formatReferenceLabel } from './format';
import { readReferencesFromDoc } from './numbering';
import type { ReferenceItem } from './types';

const PLACEHOLDER = `@article{faster-rcnn,
  title   = {Faster R-CNN: Towards Real-Time Object Detection},
  author  = {Shaoqing Ren and Kaiming He},
  journal = {arXiv preprint arXiv:1506.01497},
  year    = {2015},
  url     = {https://arxiv.org/abs/1506.01497}
}`;

/**
 * Says why the parser skipped an entry. `parseBibtex` words its reasons in
 * English; the one it gives today is translated, anything else shows as written.
 */
function skipReason(reason: string, labels: EditorLabels): string {
  return reason === 'no title' ? labels.noTitle : reason;
}

/** One line of the preview: the entry, and whether it lands on an existing id. */
function PreviewRow({
  item,
  replaces,
  labels,
}: {
  item: ReferenceItem;
  replaces: boolean;
  labels: EditorLabels;
}) {
  const detail = [item.authors, item.year, item.source]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex items-start gap-2 py-1">
      <span
        aria-hidden
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60"
      />
      <span className="min-w-0 flex-1">
        <span className="block break-words font-medium leading-snug">
          {formatReferenceLabel(item, labels.untitled)}
        </span>
        {detail && (
          <span className="block break-words text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
      {replaces && (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {labels.updateBadge}
        </span>
      )}
    </li>
  );
}

/**
 * Paste a `.bib` file, get a bibliography. The parse runs per keystroke because the
 * preview is the validation; nothing reaches the document until "Add".
 */
export function BibtexImport({
  editor,
  labels,
}: {
  editor: Editor;
  labels: EditorLabels;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');

  const { entries, skipped } = React.useMemo(() => parseBibtex(text), [text]);

  // Read once per render, not via `useEditorState`: it only decides the "update"
  // badges (a stale one costs nothing) and subscribing re-renders on every transaction.
  const existingIds = React.useMemo(() => {
    if (!entries.length) return new Set<string>();
    return new Set(
      readReferencesFromDoc(editor.state.doc).ordered.map((item) => item.id)
    );
  }, [editor, entries.length]);

  const close = () => {
    setOpen(false);
    setText('');
  };

  const submit = () => {
    if (!entries.length) return;
    editor.chain().focus().importReferences(entries).run();
    close();
  };

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
        {labels.importBibtex}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{labels.importBibtex}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title={labels.close}
          onClick={close}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <Textarea
        autoFocus
        rows={7}
        spellCheck={false}
        value={text}
        placeholder={PLACEHOLDER}
        onChange={(event) => setText(event.target.value)}
        // Escape closes; Enter must NOT submit — a `.bib` entry is multi-line
        // and typing one would post it after the first field.
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        }}
        className="min-h-0 resize-y font-mono text-[11px] leading-relaxed"
      />

      {text.trim() && (
        <div className="space-y-1.5 text-xs">
          <p className="text-muted-foreground">
            {entries.length === 0 && skipped.length === 0
              ? labels.noBibtexEntries
              : `${entries.length} ${
                  entries.length === 1 ? labels.entry : labels.entries
                }${
                  skipped.length ? ` · ${skipped.length} ${labels.skipped}` : ''
                }`}
          </p>

          {entries.length > 0 && (
            <ul className="max-h-52 overflow-y-auto">
              {entries.map((item) => (
                <PreviewRow
                  key={item.id}
                  item={item}
                  replaces={existingIds.has(item.id)}
                  labels={labels}
                />
              ))}
            </ul>
          )}

          {skipped.map((entry) => (
            <p
              key={entry.key}
              className="flex items-start gap-1.5 text-muted-foreground"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="min-w-0 break-words">
                <code className="font-mono">{entry.key}</code> —{' '}
                {skipReason(entry.reason, labels)}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={close}>
          {labels.cancel}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={entries.length === 0}
          onClick={submit}
        >
          {labels.add} {entries.length || ''}
        </Button>
      </div>
    </div>
  );
}
