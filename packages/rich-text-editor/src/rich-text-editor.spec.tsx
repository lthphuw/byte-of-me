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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Editor, JSONContent } from '@tiptap/react';
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { toast } from 'sonner';

import { testEditorLabels } from './editor-labels.test-fixture';
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
        uploadFailedText="Upload failed"
        labels={testEditorLabels}
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
  //
  // Waited on as a condition, not as a duration. This was a flat 50ms sleep,
  // which is a bet on how long mounting takes: it held when the suite ran
  // alone and lost under `turbo run test build`, where the build has the CPU
  // and the two tests that assert on the initial emit failed on every push
  // while passing on every isolated run. The editor also mounts more
  // extensions than it used to, so the bet had been getting worse.
  await React.act(async () => {
    const deadline = Date.now() + 5000;

    // The expensive part is the view mounting; wait for it to exist rather
    // than guessing at it.
    while (!document.querySelector('.ProseMirror') && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Then the create macrotask, and whatever the `onCreate` handlers do
    // inside it. A document that needs no rewrite emits nothing at all, so
    // this cannot wait on `emits` alone — it drains a bounded number of
    // macrotasks so "silent" is a conclusion rather than a race.
    for (let i = 0; i < 10 && emits.length === 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
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
          uploadFailedText="Upload failed"
          labels={testEditorLabels}
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
    const editor = (
      container?.querySelector('.tiptap') as
        | EditableWithEditor
        | null
        | undefined
    )?.editor;
    expect(editor).toBeDefined();

    await React.act(async () => {
      editor?.commands.insertContent(' typed');
      // Delivered once the author pauses (see `RichTextEditor onChange
      // timing`), so wait for the report rather than expect it in the same tick.
      const deadline = Date.now() + 2000;
      while (emits.length === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    expect(emits.length).toBeGreaterThan(0);
    expect(emits.every((emit) => emit.initial === false)).toBe(true);
  });
});

/**
 * Author edits are reported after a pause, not per keystroke — `onChange`
 * lands in react-hook-form, which deep-clones the whole form on every call
 * while anything watches it. The cost of that is why this exists; the
 * condition it has to meet is that the delay never loses an edit. So most of
 * what is asserted here is "the final document still arrives, by every route
 * a form can be left through".
 */
describe('RichTextEditor onChange timing', () => {
  type EditableWithEditor = Element & { editor?: Editor };

  // Inside a `<form>`, because every real consumer is: that is what a submit
  // has to be able to reach.
  async function mount() {
    const events: string[] = [];
    const docs: JSONContent[] = [];

    let rendered: ReturnType<typeof render> | undefined;
    await React.act(async () => {
      rendered = render(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            events.push('submit');
          }}
        >
          <RichTextEditor
            uploadFailedText="Upload failed"
            labels={testEditorLabels}
            value={PLAIN_DOC}
            onChange={(json, meta) => {
              if (meta.initial) return;
              events.push('change');
              docs.push(json);
            }}
          />
        </form>
      );
    });
    await React.act(async () => {
      const deadline = Date.now() + 5000;
      while (
        !rendered?.container.querySelector('.tiptap') &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      // Past the `create` macrotask, so every edit below is the author's.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const editor = (
      rendered?.container.querySelector('.tiptap') as EditableWithEditor | null
    )?.editor;
    if (!rendered || !editor) throw new Error('editor did not mount');

    return { ...rendered, editor, events, docs };
  }

  const pause = (ms: number) =>
    React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });

  test('a burst of edits is reported once, carrying the final document', async () => {
    const { editor, docs } = await mount();

    await React.act(async () => {
      editor.commands.insertContent(' one');
      editor.commands.insertContent(' two');
      editor.commands.insertContent(' three');
    });
    await pause(500);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toEqual(editor.getJSON());
    expect(JSON.stringify(docs[0])).toContain('three');
  });

  test('losing focus reports the pending edit at once', async () => {
    const { editor, docs } = await mount();

    await React.act(async () => {
      editor.commands.insertContent(' typed');
    });
    expect(docs).toHaveLength(0);

    await React.act(async () => {
      editor.view.dom.dispatchEvent(new FocusEvent('blur'));
    });

    expect(docs).toHaveLength(1);
    expect(docs[0]).toEqual(editor.getJSON());

    // Flushed, not merely sent early: the timer must not report it again.
    await pause(400);
    expect(docs).toHaveLength(1);
  });

  test('unmounting reports the pending edit instead of dropping it', async () => {
    const { editor, docs, unmount } = await mount();

    await React.act(async () => {
      editor.commands.insertContent(' typed');
    });
    const final = editor.getJSON();
    expect(docs).toHaveLength(0);

    await React.act(async () => {
      unmount();
    });

    expect(docs).toEqual([final]);
  });

  test('a form submit sees the pending edit before its own handler runs', async () => {
    const { editor, events, container } = await mount();

    await React.act(async () => {
      editor.commands.insertContent(' typed');
    });
    expect(events).toEqual([]);

    await React.act(async () => {
      fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    });

    expect(events).toEqual(['change', 'submit']);
  });
});

/**
 * `value` seeds the document once. A form hands the editor a fresh object on
 * every keystroke (react-hook-form clones, `toEditorContent` re-parses), and
 * Tiptap compares its options by identity — so a `content` that follows the
 * prop turns every parent render into `setOptions` -> `view.updateState`, a walk
 * of the whole document that changes nothing, since `content` is only read when
 * the document is built.
 */
describe('RichTextEditor value prop', () => {
  type EditableWithEditor = Element & { editor?: Editor };

  test('a new value after mount neither re-syncs the live view nor replaces the document', async () => {
    let rendered: ReturnType<typeof render> | undefined;
    await React.act(async () => {
      rendered = render(
        <RichTextEditor
          uploadFailedText="Upload failed"
          labels={testEditorLabels}
          value={structuredClone(PLAIN_DOC)}
          onChange={() => {}}
        />
      );
    });
    await React.act(async () => {
      const deadline = Date.now() + 5000;
      while (
        !rendered?.container.querySelector('.tiptap') &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const editor = (
      rendered?.container.querySelector('.tiptap') as EditableWithEditor | null
    )?.editor;
    if (!rendered || !editor) throw new Error('editor did not mount');

    const setOptions = spyOn(editor, 'setOptions');
    const before = editor.getJSON();

    await React.act(async () => {
      rendered?.rerender(
        <RichTextEditor
          uploadFailedText="Upload failed"
          labels={testEditorLabels}
          value={structuredClone(HEADING_DOC)}
          onChange={() => {}}
        />
      );
    });

    expect(setOptions).not.toHaveBeenCalled();
    // And the document is the one it opened with, not the new prop.
    expect(editor.getJSON()).toEqual(before);
  });
});

/**
 * The toolbar's pressed and disabled states, now that the host does not
 * re-render on every transaction. They have to arrive through the toolbar's own
 * subscription; a control that still read `editor.isActive()` during render
 * would stay as it was drawn and look correct until the first selection move.
 */
describe('RichTextEditor toolbar state', () => {
  type EditableWithEditor = Element & { editor?: Editor };

  const BOLD_THEN_PLAIN: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' plain' },
        ],
      },
    ],
  };

  test('follows the selection and the history without a host re-render', async () => {
    let container: HTMLElement | undefined;
    await React.act(async () => {
      container = render(
        <RichTextEditor
          compact
          value={BOLD_THEN_PLAIN}
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

    const editor = (
      container?.querySelector('.tiptap') as EditableWithEditor | null
    )?.editor;
    if (!container || !editor) throw new Error('editor did not mount');

    const button = (icon: string) =>
      container?.querySelector(`svg.lucide-${icon}`)?.closest('button');
    // `classList`, not a substring: every button also carries `hover:bg-accent`.
    const pressed = (icon: string) =>
      button(icon)?.classList.contains('bg-accent') ?? false;

    // The caret opens inside the bold word, nothing has been edited yet, and
    // the first snapshot — taken before the host has ever dispatched — must
    // already know a toggle can apply.
    expect(pressed('bold')).toBe(true);
    expect(button('bold')?.disabled).toBe(false);
    expect(button('undo-2')?.disabled).toBe(true);

    // A selection move changes no document — the case a per-edit subscription
    // would miss, and the one an arrow key produces.
    await React.act(async () => {
      editor.commands.setTextSelection(8);
    });
    expect(pressed('bold')).toBe(false);

    await React.act(async () => {
      editor.commands.setTextSelection(2);
    });
    expect(pressed('bold')).toBe(true);

    await React.act(async () => {
      editor.commands.insertContent('x');
    });
    expect(button('undo-2')?.disabled).toBe(false);
  });
});

describe('RichTextEditor toolbar layout', () => {
  test('keeps Preview outside the scrolling tools, so it stays in view', async () => {
    await open(PLAIN_DOC);

    const bold = screen.getByRole('button', { name: testEditorLabels.bold });
    const preview = screen.getByRole('button', {
      name: testEditorLabels.preview,
    });

    // The tools live in the horizontal scroller, which is what makes the
    // assertion below mean something: the scroller does exist here.
    expect(bold.closest('[data-radix-scroll-area-viewport]')).not.toBeNull();
    expect(preview.closest('[data-radix-scroll-area-viewport]')).toBeNull();
  });

  test('draws the bar at the top of the frame when no target is given', async () => {
    await open(PLAIN_DOC);

    const bold = screen.getByRole('button', { name: testEditorLabels.bold });
    expect(frameOf(bold)).not.toBeNull();
  });

  test('draws the bar into toolbarTarget, and never inside the frame', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    await React.act(async () => {
      render(
        <RichTextEditor
          uploadFailedText="Upload failed"
          labels={testEditorLabels}
          value={PLAIN_DOC}
          toolbarTarget={target}
        />
      );
    });
    await waitForSurface();

    const bold = screen.getByRole('button', { name: testEditorLabels.bold });
    expect(target.contains(bold)).toBe(true);
    expect(frameOf(bold)).toBeNull();
    target.remove();
  });
});

/** The editor frame that holds `node`, or `null` when `node` is outside it. */
function frameOf(node: Element): Element | null {
  return node.closest('.overflow-clip');
}

/** Waits for the writing surface, the same condition `open` waits on. */
async function waitForSurface(): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!document.querySelector('.ProseMirror') && Date.now() < deadline) {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

/**
 * A row of images is a document node, so it has to survive being *opened* —
 * the render pipeline test in `lib/render-pipeline.spec.ts` covers the
 * published page, and this covers the editor's own node views, which are the
 * half that can fail on `NodeViewContent` without the schema being wrong.
 */
describe('RichTextEditor image rows', () => {
  test('opens a stored row with both images and an editable row caption', async () => {
    let container: HTMLElement | undefined;

    await React.act(async () => {
      container = render(
        <RichTextEditor
          uploadFailedText="Upload failed"
          labels={testEditorLabels}
          value={{
            type: 'doc',
            content: [
              {
                type: 'imageGroup',
                attrs: { caption: 'Before and after' },
                content: [
                  {
                    type: 'image',
                    attrs: { src: 'https://example.test/a.png', alt: 'A' },
                  },
                  {
                    type: 'image',
                    attrs: { src: 'https://example.test/b.png', alt: 'B' },
                  },
                ],
              },
            ],
          }}
          onChange={() => {}}
        />
      ).container;
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // The class the published page lays the row out with — the editor uses the
    // same one so the two cannot drift.
    expect(container?.querySelector('.image-group-items')).not.toBeNull();
    expect(container?.querySelectorAll('img')).toHaveLength(2);

    const rowCaption = container?.querySelector<HTMLInputElement>(
      'input[aria-label="Caption for this row"]'
    );
    expect(rowCaption?.value).toBe('Before and after');

    // A real figcaption, not a styled div — in the editor as well as in the
    // rendered article.
    expect(rowCaption?.closest('figcaption')).not.toBeNull();
  });

  test('deleting the last image of a row removes the row itself', async () => {
    let container: HTMLElement | undefined;

    await React.act(async () => {
      container = render(
        <RichTextEditor
          uploadFailedText="Upload failed"
          labels={testEditorLabels}
          value={{
            type: 'doc',
            content: [
              {
                type: 'imageGroup',
                attrs: { caption: 'One left' },
                content: [
                  {
                    type: 'image',
                    attrs: { src: 'https://example.test/a.png', alt: 'A' },
                  },
                ],
              },
            ],
          }}
          onChange={() => {}}
        />
      ).container;
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    type EditableWithEditor = Element & {
      editor?: {
        commands: {
          setNodeSelection: (pos: number) => boolean;
          deleteSelection: () => boolean;
        };
        getJSON: () => JSONContent;
      };
    };
    const editor = (
      container?.querySelector('.tiptap') as EditableWithEditor | null
    )?.editor;
    expect(editor).toBeDefined();

    await React.act(async () => {
      // Position 1 is the image inside the row: what clicking it selects, and
      // what the delete key then acts on.
      editor?.commands.setNodeSelection(1);
      editor?.commands.deleteSelection();
    });

    // The row's content is `image*`, so ProseMirror leaves an EMPTY row behind
    // rather than repairing it with a blank image node (what `image+` did —
    // measured). The cleanup plugin has to take it from there, or the author
    // is left with an empty captioned figure they never asked for.
    const types = JSON.stringify(editor?.getJSON());
    expect(types).not.toContain('imageGroup');
    expect(types).not.toContain('One left');
  });
});

/**
 * Pasted Markdown source becomes blocks.
 *
 * ProseMirror read `text/plain` as paragraphs, so `## Title` arrived as those characters; only
 * `**bold**` and `` `code` `` converted, through their mark paste rules. Found by pasting a
 * README section into the featured-work details editor in a real browser.
 *
 * The event is built by hand, with the clipboard as a plain object, and goes through
 * ProseMirror's own paste handler; the contract is the document that results.
 */
describe('RichTextEditor markdown paste', () => {
  type Surface = HTMLElement & { editor?: Editor };

  async function mount(): Promise<Editor> {
    await open(PLAIN_DOC);
    const editor = (document.querySelector('.ProseMirror') as Surface | null)
      ?.editor;
    if (!editor) throw new Error('the editor did not mount');
    return editor;
  }

  function paste(editor: Editor, text: string, html = '') {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        files: [],
        getData: (type: string) =>
          type === 'text/plain' ? text : type === 'text/html' ? html : '',
      },
    });
    editor.view.dom.dispatchEvent(event);
  }

  const blockTypes = (editor: Editor) =>
    (editor.getJSON().content ?? []).map((node) => node.type);

  test('turns a heading, a list, a table and a fence into blocks, after the caret', async () => {
    const editor = await mount();
    editor.commands.focus('end');

    await React.act(async () => {
      paste(
        editor,
        '## Results\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```py\nprint(1)\n```'
      );
    });

    expect(blockTypes(editor)).toEqual([
      'paragraph',
      'heading',
      'bulletList',
      'table',
      'codeBlock',
      // The editor keeps a paragraph after a code block, so the caret has somewhere to go.
      'paragraph',
    ]);
    // The paragraph that was there stays first: the blocks land at the caret.
    expect(editor.state.doc.child(0).textContent).toBe('Body');
    expect(editor.state.doc.child(1).attrs.level).toBe(2);
  });

  test('leaves ordinary text as text', async () => {
    const editor = await mount();
    editor.commands.focus('end');

    await React.act(async () => {
      paste(editor, 'Measured on a T4 - twice. See #498.');
    });

    expect(blockTypes(editor)).toEqual(['paragraph']);
    expect(editor.getText()).toContain('Measured on a T4 - twice. See #498.');
  });

  test('keeps the structure of a rendered page instead of parsing its text again', async () => {
    const editor = await mount();
    editor.commands.focus('end');

    // The plain text says heading and one item; the HTML says a two-item list. The HTML wins.
    await React.act(async () => {
      paste(
        editor,
        '## Wrong\n- x',
        '<ul><li><p>a</p></li><li><p>b</p></li></ul><p>tail</p>'
      );
    });

    const types = blockTypes(editor);
    expect(types).toContain('bulletList');
    expect(types).not.toContain('heading');
    expect(editor.getText()).not.toContain('Wrong');
    expect(editor.getText()).toContain('tail');
  });

  test('pastes Markdown literally inside a code block', async () => {
    const editor = await mount();
    editor.commands.setCodeBlock();
    // Not `focus('end')`: that lands in the paragraph the editor keeps after the block.
    editor.commands.setTextSelection(2);

    await React.act(async () => {
      paste(editor, '## not a heading\n- not a list');
    });

    expect(blockTypes(editor)).not.toContain('heading');
    expect(blockTypes(editor)).not.toContain('bulletList');
    expect(editor.getText()).toContain('## not a heading');
  });
});

/**
 * A `blob:` image is a file waiting for its upload. With no uploader there is
 * nothing to ever replace that address, and a document saved holding one is
 * broken for every reader: the node is removed and the author is told.
 */
describe('RichTextEditor image without an uploader', () => {
  test('removes a blob image and reports it, instead of keeping an address only this tab can read', async () => {
    const toastError = spyOn(toast, 'error').mockImplementation(() => 'id');
    try {
      await React.act(async () => {
        render(
          <RichTextEditor
            uploadFailedText="Upload failed"
            labels={testEditorLabels}
            value={{
              type: 'doc',
              content: [
                { type: 'image', attrs: { src: 'blob:http://localhost/abc' } },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Body' }],
                },
              ],
            }}
          />
        );
      });
      await React.act(async () => {
        const deadline = Date.now() + 3000;
        while (toastError.mock.calls.length === 0 && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      });

      const editor = (
        document.querySelector('.ProseMirror') as HTMLElement & {
          editor?: Editor;
        }
      ).editor;

      expect(toastError).toHaveBeenCalledWith('Upload failed');
      expect(JSON.stringify(editor?.getJSON())).not.toContain('blob:');
    } finally {
      toastError.mockRestore();
    }
  });
});

/** A dropped or pasted image file is uploaded and lands in the document. */
describe('RichTextEditor image paste', () => {
  type Surface = HTMLElement & { editor?: Editor };

  test('uploads a pasted image file and inserts it at the caret', async () => {
    const uploaded: File[] = [];
    await React.act(async () => {
      render(
        <RichTextEditor
          uploadFailedText="Upload failed"
          labels={testEditorLabels}
          value={PLAIN_DOC}
          uploadImage={async (file) => {
            uploaded.push(file);
            return `https://cdn.test/${file.name}`;
          }}
        />
      );
    });
    await React.act(async () => {
      while (!document.querySelector('.ProseMirror')) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });
    const editor = (document.querySelector('.ProseMirror') as Surface).editor;
    if (!editor) throw new Error('the editor did not mount');
    editor.commands.focus('end');

    const shot = new File(['x'], 'shot.png', { type: 'image/png' });
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { files: [shot], getData: () => '' },
    });
    await React.act(async () => {
      editor.view.dom.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(uploaded).toEqual([shot]);
    expect(event.defaultPrevented).toBe(true);
    expect(JSON.stringify(editor.getJSON())).toContain(
      'https://cdn.test/shot.png'
    );
  });
});

/**
 * `scope` on the header cells of a table, in the EDITOR's DOM.
 *
 * The published render pipeline has carried it since `ScopedTable`, and
 * `lib/render-pipeline.spec.ts` guards that half. This is the other half, and
 * it was missing entirely: `ScopedTable`/`NumericTableHeader` are registered
 * only in `renderExtensions`, so the editor — which is the surface the note's
 * own author reads their document on — mounted a stock `TableKit` and produced
 * 184 `<th>` with not one `scope` among them. Measured on the live note at
 * `/space/notes/[id]`: `document.querySelectorAll('.ProseMirror th[scope]')`
 * returned 0.
 *
 * The mutation cases below are the point of the file. A scope that is right on
 * first render and wrong after a row is inserted is worse than no scope: it
 * tells assistive tech, with authority, which header a number belongs to, and
 * is lying. Each one edits through the editor's own commands and re-reads the
 * DOM, so what is asserted is what a screen reader would meet.
 */
describe('RichTextEditor table header scopes', () => {
  const cell = (
    text: string,
    type: 'tableCell' | 'tableHeader' = 'tableCell'
  ): JSONContent => ({
    type,
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });

  const tableRow = (cells: JSONContent[]): JSONContent => ({
    type: 'tableRow',
    content: cells,
  });

  // The shape these notes actually have: a header row, and a `th` row label
  // pinned at the start of every body row.
  const BENCHMARK_TABLE: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'table',
        content: [
          tableRow([
            cell('Model', 'tableHeader'),
            cell('AP', 'tableHeader'),
            cell('FPS', 'tableHeader'),
          ]),
          tableRow([cell('YOLOv8', 'tableHeader'), cell('35.2'), cell('12')]),
          tableRow([cell('RF-DETR', 'tableHeader'), cell('48.0'), cell('25')]),
        ],
      },
    ],
  };

  type EditableWithEditor = Element & { editor?: Editor };

  async function openTable(value: JSONContent = BENCHMARK_TABLE) {
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
      while (
        !container?.querySelector('.ProseMirror th') &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    const editor = (
      container?.querySelector('.tiptap') as EditableWithEditor | null
    )?.editor;
    if (!container || !editor) throw new Error('editor did not mount');

    return { container, editor };
  }

  /** Every `th` in the editor, as `text → scope`, in document order. */
  function scopes(container: HTMLElement): [string, string | null][] {
    return Array.from(container.querySelectorAll('.ProseMirror th')).map(
      (th): [string, string | null] => [
        th.textContent ?? '',
        th.getAttribute('scope'),
      ]
    );
  }

  /** Puts the cursor in the cell holding `text` — what clicking it would do. */
  function putCursorIn(editor: Editor, text: string): void {
    let pos = -1;
    editor.state.doc.descendants((node, at) => {
      if (pos !== -1) return false;
      const isCell =
        node.type.name === 'tableCell' || node.type.name === 'tableHeader';
      // `at + 2` is inside the cell's paragraph: the cell opens at `at`, its
      // paragraph at `at + 1`.
      if (isCell && node.textContent === text) pos = at + 2;
      return pos === -1;
    });
    if (pos === -1) throw new Error(`no cell containing ${text}`);
    editor.commands.setTextSelection(pos);
  }

  test('scopes the header row by column and the row labels by row', async () => {
    const { container } = await openTable();

    expect(scopes(container)).toEqual([
      ['Model', 'col'],
      ['AP', 'col'],
      ['FPS', 'col'],
      ['YOLOv8', 'row'],
      ['RF-DETR', 'row'],
    ]);
  });

  test('a row inserted between body rows gets its label scoped', async () => {
    const { container, editor } = await openTable();

    await React.act(async () => {
      putCursorIn(editor, 'YOLOv8');
      editor.commands.addRowAfter();
    });

    // prosemirror-tables copies the cell types of the row it was asked to
    // follow, so the new row opens with a `th` of its own — which must be
    // scoped `row`, not left bare and not inheriting `col`.
    expect(scopes(container)).toEqual([
      ['Model', 'col'],
      ['AP', 'col'],
      ['FPS', 'col'],
      ['YOLOv8', 'row'],
      ['', 'row'],
      ['RF-DETR', 'row'],
    ]);
  });

  test('deleting the header row promotes the row beneath it to column headers', async () => {
    const { container, editor } = await openTable();

    await React.act(async () => {
      putCursorIn(editor, 'Model');
      editor.commands.deleteRow();
    });

    // The case a decoration mapped forward without rebuilding gets wrong:
    // `YOLOv8` did not move relative to the table, it changed MEANING — it is
    // the header row now, so its scope has to flip from `row` to `col`.
    expect(scopes(container)).toEqual([
      ['YOLOv8', 'col'],
      ['RF-DETR', 'row'],
    ]);
  });

  test('a column added after the row label leaves the header row scoped by column', async () => {
    const { container, editor } = await openTable();

    await React.act(async () => {
      putCursorIn(editor, 'Model');
      editor.commands.addColumnAfter();
    });

    expect(scopes(container)).toEqual([
      ['Model', 'col'],
      ['', 'col'],
      ['AP', 'col'],
      ['FPS', 'col'],
      ['YOLOv8', 'row'],
      ['RF-DETR', 'row'],
    ]);
  });
});
