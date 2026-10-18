'use client';

import * as React from 'react';
import {
  createReferenceId,
  type ReferenceItem,
} from '@byte-of-me/rich-text-schema';
import { Button, Input, Label } from '@byte-of-me/ui-primitives';

import type { EditorLabels } from '../../editor-labels';

type ReferenceFormProps = {
  /** Entry being edited, or `null`/undefined when adding a new one. */
  value?: ReferenceItem | null;
  /** The editor's labels; the app supplies them. */
  labels: EditorLabels;
  onSubmit: (item: ReferenceItem) => void;
  onCancel: () => void;
};

// The placeholders are sample citation data, not interface text, so they stay
// in English; the field names come from the app.
function referenceFields(labels: EditorLabels): {
  key: Exclude<keyof ReferenceItem, 'id'>;
  label: string;
  placeholder: string;
}[] {
  return [
    {
      key: 'title',
      label: labels.title,
      placeholder: 'Attention is all you need',
    },
    {
      key: 'authors',
      label: labels.authors,
      placeholder: 'Vaswani, A. et al.',
    },
    { key: 'source', label: labels.source, placeholder: 'NeurIPS' },
    { key: 'year', label: labels.year, placeholder: '2017' },
    {
      key: 'url',
      label: labels.url,
      placeholder: 'https://arxiv.org/abs/1706.03762',
    },
  ];
}

/**
 * Fields for one bibliography entry. Deliberately not a `<form>` element: the
 * editor is mounted inside the blog form, and a nested form submits the whole
 * post through React's portal event bubbling.
 */
export function ReferenceForm({
  value,
  labels,
  onSubmit,
  onCancel,
}: ReferenceFormProps) {
  const [draft, setDraft] = React.useState<ReferenceItem>(
    () => value ?? { id: createReferenceId(), title: '' }
  );

  React.useEffect(() => {
    setDraft(value ?? { id: createReferenceId(), title: '' });
  }, [value]);

  const canSubmit = draft.title.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      ...draft,
      title: draft.title.trim(),
      authors: draft.authors?.trim() || undefined,
      source: draft.source?.trim() || undefined,
      year: draft.year?.trim() || undefined,
      url: draft.url?.trim() || undefined,
    });
  };

  return (
    <div
      className="space-y-2.5"
      onKeyDown={(event) => {
        // Enter in a field submits; on a button it presses that button, and
        // one that commits an IME composition is neither.
        if (
          event.key === 'Enter' &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing &&
          event.target instanceof HTMLInputElement
        ) {
          event.preventDefault();
          submit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      {referenceFields(labels).map((field) => (
        <div key={field.key} className="space-y-1">
          <Label className="text-xs" htmlFor={`${draft.id}-${field.key}`}>
            {field.label}
            {field.key === 'title' ? ' *' : ''}
          </Label>
          <Input
            id={`${draft.id}-${field.key}`}
            className="h-8 text-sm"
            value={draft[field.key] ?? ''}
            placeholder={field.placeholder}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                [field.key]: event.target.value,
              }))
            }
          />
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button type="button" size="sm" disabled={!canSubmit} onClick={submit}>
          {value ? labels.save : labels.add}
        </Button>
      </div>
    </div>
  );
}
