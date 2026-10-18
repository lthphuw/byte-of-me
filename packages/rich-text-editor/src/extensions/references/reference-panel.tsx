'use client';

import * as React from 'react';
import {
  CITATION_NAME,
  formatReferenceLabel,
  readReferencesFromDoc,
  type ReferenceItem,
} from '@byte-of-me/rich-text-schema';
import { Button, ConfirmDialog, Input, Label } from '@byte-of-me/ui-primitives';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { Pencil, Plus, Quote, Trash2 } from 'lucide-react';

import type { EditorLabels } from '../../editor-labels';

import { BibtexImport } from './bibtex-import';
import { ReferenceForm } from './reference-form';

type PanelState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; item: ReferenceItem };

function countCitations(editor: Editor, refId: string): number {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === CITATION_NAME && node.attrs.refId === refId)
      count += 1;
    return true;
  });
  return count;
}

/**
 * Bibliography manager shown beside the editor. Entries are added here and
 * cited in the text with the toolbar's citation button or each entry's
 * "Insert" action.
 */
export function ReferencePanel({
  editor,
  labels,
}: {
  editor: Editor;
  labels: EditorLabels;
}) {
  const [state, setState] = React.useState<PanelState>({ mode: 'idle' });
  const [pendingDelete, setPendingDelete] =
    React.useState<ReferenceItem | null>(null);

  const { ordered, title } = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const numbering = readReferencesFromDoc(current?.state.doc);
      return { ordered: numbering.ordered, title: numbering.title };
    },
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  const save = (item: ReferenceItem) => {
    editor.chain().focus().upsertReference(item).run();
    setState({ mode: 'idle' });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    editor.chain().focus().removeReference(pendingDelete.id).run();
    setPendingDelete(null);
  };

  const citationCount = pendingDelete
    ? countCitations(editor, pendingDelete.id)
    : 0;

  return (
    <div className="space-y-4">
      {ordered.length > 0 && (
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {labels.sectionHeading}
          </Label>
          <Input
            className="h-8 text-sm"
            defaultValue={title}
            key={title}
            onBlur={(event) =>
              editor.commands.setReferencesTitle(event.target.value)
            }
          />
        </div>
      )}

      <ol className="space-y-2">
        {ordered.map((item, index) => (
          <li
            key={item.id}
            className="rounded-md border bg-background p-2 text-xs"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 tabular-nums text-muted-foreground">
                [{index + 1}]
              </span>
              <p className="min-w-0 flex-1 break-words font-medium leading-snug">
                {formatReferenceLabel(item, labels.untitled)}
              </p>
            </div>

            <div className="mt-2 flex items-center justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title={labels.insertCitationAtCursor}
                onClick={() =>
                  editor.chain().focus().insertCitation(item.id).run()
                }
              >
                <Quote className="mr-1 h-3 w-3" />
                {labels.insert}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={labels.editReference}
                onClick={() => setState({ mode: 'edit', item })}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive-text"
                title={labels.deleteReference}
                onClick={() => setPendingDelete(item)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {state.mode === 'edit' && state.item.id === item.id && (
              <div className="mt-2 border-t pt-2">
                <ReferenceForm
                  value={state.item}
                  labels={labels}
                  onSubmit={save}
                  onCancel={() => setState({ mode: 'idle' })}
                />
              </div>
            )}
          </li>
        ))}
      </ol>

      {state.mode === 'create' ? (
        <div className="rounded-md border bg-background p-2">
          <ReferenceForm
            labels={labels}
            onSubmit={save}
            onCancel={() => setState({ mode: 'idle' })}
          />
        </div>
      ) : (
        <div className="space-y-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => setState({ mode: 'create' })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {labels.addReference}
          </Button>
          <BibtexImport editor={editor} labels={labels} />
        </div>
      )}

      {ordered.length === 0 && state.mode !== 'create' && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {labels.referencesNumbering}
        </p>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={labels.deleteReferenceTitle}
        description={
          citationCount > 0
            ? `${labels.citedCountPrefix} ${citationCount} ${
                citationCount === 1
                  ? labels.citedTimeSingular
                  : labels.citedTimePlural
              } ${labels.citedCountSuffix}`
            : labels.renumberedReferences
        }
        confirmLabel={labels.delete}
        cancelLabel={labels.cancel}
      />
    </div>
  );
}
