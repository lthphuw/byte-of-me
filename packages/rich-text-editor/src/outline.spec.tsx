/**
 * The outline aside as an author meets it: a button per heading once the editor has settled,
 * absent from a compact editor, and a way to the heading. Renders the real editor; the outline
 * rebuilds on a 300 ms pause, so specs wait for the list, not a duration.
 */
import * as React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { JSONContent } from '@tiptap/react';
import { afterEach, describe, expect, test } from 'bun:test';

import { testEditorLabels } from './editor-labels.test-fixture';
import { RichTextEditor } from './rich-text-editor';

afterEach(cleanup);

const DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Setup' }],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Install' }],
    },
  ],
};

async function open(compact: boolean) {
  await React.act(async () => {
    render(
      <RichTextEditor
        uploadFailedText="Upload failed"
        labels={testEditorLabels}
        value={DOC}
        compact={compact}
        onChange={() => {}}
      />
    );
  });
  // The ids are stamped from `onCreate`, then the outline is rebuilt on a pause.
  await React.act(async () => {
    const deadline = Date.now() + 3000;
    while (
      !screen.queryByRole('button', { name: 'Install' }) &&
      !compact &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (compact) await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

describe('RichTextEditor outline', () => {
  test('lists every heading, with a button that goes to it', async () => {
    await open(false);

    expect(screen.getByRole('button', { name: 'Setup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Install' })).toBeTruthy();

    const target = document.querySelector('[data-toc-id]') as HTMLElement;
    let scrolled = false;
    target.scrollIntoView = () => {
      scrolled = true;
    };
    fireEvent.click(screen.getByRole('button', { name: 'Setup' }));

    expect(scrolled).toBe(true);
  });

  test('is not drawn by a compact editor, which does not track one', async () => {
    await open(true);

    expect(screen.queryByRole('button', { name: 'Setup' })).toBeNull();
    expect(screen.queryByText(testEditorLabels.outlineTab)).toBeNull();
  });
});
