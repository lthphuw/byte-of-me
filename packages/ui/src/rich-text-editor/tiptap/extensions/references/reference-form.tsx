'use client';

import * as React from 'react';

import { Button } from '../../../../button';
import { Input } from '../../../../input';
import { Label } from '../../../../label';

import { createReferenceId, type ReferenceItem } from './types';

type ReferenceFormProps = {
  /** Entry being edited, or `null`/undefined when adding a new one. */
  value?: ReferenceItem | null;
  onSubmit: (item: ReferenceItem) => void;
  onCancel: () => void;
};

const FIELDS: {
  key: Exclude<keyof ReferenceItem, 'id'>;
  label: string;
  placeholder: string;
}[] = [
  { key: 'title', label: 'Title', placeholder: 'Attention is all you need' },
  { key: 'authors', label: 'Authors', placeholder: 'Vaswani, A. et al.' },
  { key: 'source', label: 'Source', placeholder: 'NeurIPS' },
  { key: 'year', label: 'Year', placeholder: '2017' },
  { key: 'url', label: 'URL', placeholder: 'https://arxiv.org/abs/1706.03762' },
];

/**
 * Fields for one bibliography entry. Deliberately not a `<form>` element: the
 * editor is mounted inside the blog form, and a nested form submits the whole
 * post through React's portal event bubbling.
 */
export function ReferenceForm({
  value,
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
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          submit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      {FIELDS.map((field) => (
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
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={!canSubmit} onClick={submit}>
          {value ? 'Save' : 'Add'}
        </Button>
      </div>
    </div>
  );
}
