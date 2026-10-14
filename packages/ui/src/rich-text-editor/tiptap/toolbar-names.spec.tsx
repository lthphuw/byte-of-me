/**
 * Every full-editor toolbar control has an accessible name, and the full editor
 * offers the touch formatting sheet. Icon-only buttons were named by tooltip
 * alone, which a screen reader does not announce as a name.
 */
import * as React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Editor, JSONContent } from '@tiptap/react';
import { afterEach, describe, expect, test } from 'bun:test';

import { testEditorLabels } from './editor-labels.test-fixture';
import { RichTextEditor } from './rich-text-editor';

afterEach(() => {
  cleanup();
});

const PLAIN_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }],
};

const HEADING_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Section' }],
    },
  ],
};

const TABLE_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Cell' }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

async function mountFullEditor(value: JSONContent) {
  let container: HTMLElement | undefined;
  await React.act(async () => {
    container = render(
      <RichTextEditor
        value={value}
        onChange={() => {}}
        uploadFailedText="Upload failed"
        labels={testEditorLabels}
      />
    ).container;
  });
  await React.act(async () => {
    const deadline = Date.now() + 5000;
    while (!container?.querySelector('.tiptap') && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });
  if (!container) throw new Error('editor did not mount');
  return container;
}

describe('RichTextEditor toolbar names', () => {
  test('names every icon-only control from the editor labels', async () => {
    await mountFullEditor(PLAIN_DOC);

    for (const name of [
      testEditorLabels.undo,
      testEditorLabels.redo,
      testEditorLabels.blockquote,
      testEditorLabels.code,
      testEditorLabels.codeBlock,
      testEditorLabels.bold,
      testEditorLabels.italic,
      testEditorLabels.underline,
      testEditorLabels.strikethrough,
      testEditorLabels.cite,
      testEditorLabels.bulletList,
      testEditorLabels.orderedList,
      testEditorLabels.horizontalRule,
      testEditorLabels.insertTable,
      testEditorLabels.image,
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  test('names the heading control and each level from the editor labels', async () => {
    await mountFullEditor(HEADING_DOC);

    // The caret opens inside the H2, so the control reads that level.
    fireEvent.pointerDown(
      screen.getByRole('button', { name: testEditorLabels.heading2 }),
      { button: 0, ctrlKey: false }
    );

    for (const name of [
      testEditorLabels.heading1,
      testEditorLabels.heading2,
      testEditorLabels.heading3,
    ]) {
      expect(screen.getByRole('menuitem', { name })).toBeTruthy();
    }
    expect(screen.queryByRole('menuitem', { name: 'H2' })).toBeNull();
  });

  test('names the phone heading group and its levels from the editor labels', async () => {
    // The phone group is picked by a `max-width: 640px` media query, which
    // happy-dom evaluates against `innerWidth`.
    const width = window.innerWidth;
    window.innerWidth = 375;
    try {
      await mountFullEditor(HEADING_DOC);

      fireEvent.click(
        screen.getByRole('button', { name: testEditorLabels.heading2 })
      );

      for (const name of [
        testEditorLabels.heading1,
        testEditorLabels.heading2,
        testEditorLabels.heading3,
      ]) {
        expect(screen.getByRole('button', { name })).toBeTruthy();
      }
    } finally {
      window.innerWidth = width;
    }
  });

  test('names the table menu while the caret is inside a table', async () => {
    const container = await mountFullEditor(TABLE_DOC);
    const editor = (
      container.querySelector('.tiptap') as
        | (Element & { editor?: Editor })
        | null
    )?.editor;
    if (!editor) throw new Error('editor did not expose its instance');

    // Inside the cell's paragraph: table(0) > row(1) > cell(2) > paragraph(3) > text(4).
    await React.act(async () => {
      editor.commands.setTextSelection(4);
    });

    expect(
      screen.getByRole('button', { name: testEditorLabels.tableOptions })
    ).toBeTruthy();
  });

  test('offers the formatting sheet on a phone-width full editor, and not beside a desktop bar', async () => {
    // Mounted only below `md`: a desktop editor has the full toolbar instead.
    await mountFullEditor(PLAIN_DOC);
    expect(
      screen.queryByRole('button', {
        name: testEditorLabels.openFormattingTools,
      })
    ).toBeNull();
    cleanup();

    const width = window.innerWidth;
    window.innerWidth = 375;
    try {
      await mountFullEditor(PLAIN_DOC);

      fireEvent.click(
        screen.getByRole('button', {
          name: testEditorLabels.openFormattingTools,
        })
      );

      expect(
        screen.getByRole('menu', { name: testEditorLabels.formatting })
      ).toBeTruthy();
      expect(
        screen.getByRole('menuitem', { name: testEditorLabels.bold })
      ).toBeTruthy();
    } finally {
      window.innerWidth = width;
    }
  });
});
