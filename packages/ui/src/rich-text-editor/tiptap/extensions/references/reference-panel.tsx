'use client';

import * as React from 'react';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { Pencil, Plus, Quote, Trash2 } from 'lucide-react';

import { Button } from '../../../../button';
import { ConfirmDeleteDialog } from '../../../../confirm-delete-dialog';
import { Input } from '../../../../input';
import { Label } from '../../../../label';

import { formatReferenceLabel } from './format';
import { readReferencesFromDoc } from './numbering';
import { ReferenceForm } from './reference-form';
import { CITATION_NAME, type ReferenceItem } from './types';

type PanelState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; item: ReferenceItem };

function countCitations(editor: Editor, refId: string): number {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === CITATION_NAME && node.attrs.refId === refId) count += 1;
    return true;
  });
  return count;
}

/**
 * Bibliography manager shown beside the editor. Entries are added here and
 * cited in the text with the toolbar's citation button or each entry's
 * "Insert" action.
 */
export function ReferencePanel({ editor }: { editor: Editor }) {
  const [state, setState] = React.useState<PanelState>({ mode: 'idle' });
  const [pendingDelete, setPendingDelete] = React.useState<ReferenceItem | null>(
    null
  );

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
            Section heading
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
                {formatReferenceLabel(item)}
              </p>
            </div>

            <div className="mt-2 flex items-center justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title="Insert citation at cursor"
                onClick={() =>
                  editor.chain().focus().insertCitation(item.id).run()
                }
              >
                <Quote className="mr-1 h-3 w-3" />
                Insert
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Edit reference"
                onClick={() => setState({ mode: 'edit', item })}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                title="Delete reference"
                onClick={() => setPendingDelete(item)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {state.mode === 'edit' && state.item.id === item.id && (
              <div className="mt-2 border-t pt-2">
                <ReferenceForm
                  value={state.item}
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
            onSubmit={save}
            onCancel={() => setState({ mode: 'idle' })}
          />
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setState({ mode: 'create' })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add reference
        </Button>
      )}

      {ordered.length === 0 && state.mode !== 'create' && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          References are numbered by the order they are first cited, and render
          as a bibliography at the end of the article.
        </p>
      )}

      <ConfirmDeleteDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this reference?"
        description={
          citationCount > 0
            ? `It is cited ${citationCount} time${citationCount === 1 ? '' : 's'} in the text. Those markers will be removed and the remaining references renumbered.`
            : 'The remaining references will be renumbered.'
        }
      />
    </div>
  );
}
