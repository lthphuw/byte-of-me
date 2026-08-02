/**
 * What `onChange` means.
 *
 * An editor that opens a stored document does not always leave it alone: the
 * `TableOfContents` extension (registered whenever `compact` is false)
 * assigns an id to every heading that lacks one, in a transaction it
 * dispatches from `onCreate` — and Tiptap fires `onUpdate` for any
 * doc-changing transaction, its own included. So `onChange` carries two
 * different things: what the author did, and what the editor had to do to
 * show them their document. A consumer that autosaves cannot tell those
 * apart from the JSON alone (the reported document is normalised too —
 * parse-time attribute defaults — so it never equals the string that was
 * loaded), which is how `note-editor.tsx` came to write every note back over
 * itself on open. `RichTextChangeMeta.initial` is the distinction, reported
 * from the editor because the editor is the only thing that knows.
 *
 * These tests mount the real component — no double. That is deliberate: the
 * bug this file exists for got through a 192-test suite precisely because
 * the double in `apps/web` was more passive than the component it replaced,
 * and a second double would only move the problem.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { JSONContent } from '@tiptap/react';
import { afterEach, describe, expect, test } from 'bun:test';

import { RichTextEditor } from './rich-text-editor';

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
      content: [{ type: 'text', text: 'Reading list' }],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
  ],
};

// `@testing-library/react` only auto-registers this when it detects a
// Jest/Vitest-shaped global; `bun:test`'s `afterEach` is imported, so it
// never fires here. Without it every editor this file mounts stays in
// `document.body` — and the last test reaches its editor through the DOM,
// which would then find the first test's dead one instead. (Observed: that
// test passed alone and failed in a full-suite run before this was added.)
afterEach(() => {
  cleanup();
});

type Emit = { json: JSONContent; initial: boolean };

async function open(value: JSONContent, compact = false): Promise<Emit[]> {
  const emits: Emit[] = [];

  await React.act(async () => {
    render(
      <RichTextEditor
        value={value}
        compact={compact}
        onChange={(json, meta) => emits.push({ json, initial: meta.initial })}
      />
    );
  });

  // Tiptap emits `create` from a `setTimeout(0)` after the view mounts, and
  // the extension `onCreate` handlers that change the document run inside
  // that emit — so the initial `onUpdate` lands a macrotask after render,
  // not during it.
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  return emits;
}

describe('RichTextEditor onChange', () => {
  test('reports the document it rewrote while opening as initial, not as an edit', async () => {
    const emits = await open(HEADING_DOC);

    // One emit, and it must be flagged: the TableOfContents extension gave
    // the heading an id, which is a real document change — the editor's own,
    // made before the author could touch anything.
    expect(emits).toHaveLength(1);
    expect(emits[0]?.initial).toBe(true);

    // And it genuinely differs from what was passed in, which is why a
    // consumer comparing documents cannot close this on its own.
    expect(emits[0]?.json).not.toEqual(HEADING_DOC);
  });

  test('stays silent opening a document it does not have to rewrite', async () => {
    // No heading, so nothing assigns an id and no transaction changes the
    // doc. Documents the boundary: the initial emit is not "always one emit
    // on mount" that a consumer could count and skip — skipping "the first
    // emit" would eat a genuine first edit for exactly these documents,
    // which is why the flag, and not a counter, is the answer.
    expect(await open(PLAIN_DOC)).toEqual([]);
  });

  test('an author edit is reported with initial false', async () => {
    const emits: Emit[] = [];
    let container: HTMLElement | undefined;

    await React.act(async () => {
      container = render(
        <RichTextEditor
          value={HEADING_DOC}
          onChange={(json, meta) => emits.push({ json, initial: meta.initial })}
        />
      ).container;
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    emits.length = 0;

    // Reaches the live editor the way Tiptap itself exposes it — it hangs the
    // instance off the editable element (`view.dom.editor`, which its own
    // `unmount` deletes again). Typing through happy-dom would exercise
    // ProseMirror's `contentEditable`/Selection handling, which happy-dom
    // does not fully implement; a command produces the same transaction the
    // author's keystroke would. Scoped to THIS render's container, never
    // `document`, so it cannot pick up an editor another test left behind.
    type EditableWithEditor = Element & {
      editor?: { commands: { insertContent: (value: string) => boolean } };
    };
    const editor = (container?.querySelector('.tiptap') as
      | EditableWithEditor
      | null
      | undefined)?.editor;
    expect(editor).toBeDefined();

    await React.act(async () => {
      editor?.commands.insertContent(' typed');
    });

    expect(emits.length).toBeGreaterThan(0);
    expect(emits.every((emit) => emit.initial === false)).toBe(true);
  });
});
