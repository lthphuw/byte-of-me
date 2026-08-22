import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

import {
  blockAtLine,
  buildMarkdownAnchorMap,
  lineAtOffset,
  type MarkdownAnchorMap,
} from './markdown-anchor';

/**
 * Keeping the author's place across the WYSIWYG ↔ markdown toggle.
 *
 * The two views share one scroll container, so `scrollTop` survives the switch
 * untranslated — and means something different on the other side, because a
 * rendered table occupying 800px is forty lines of source. This module reads
 * where the author is from whichever view is still on screen, and puts the
 * other view there.
 *
 * The anchor is the CARET when the caret is in view, and the topmost visible
 * block otherwise. That ordering matters: someone who has been typing expects
 * to carry on typing in the same place, while someone who has been reading
 * expects to keep reading from the same place, and where the caret sits is
 * what tells the two apart.
 */

/** The document's top-level blocks, with the position each starts at. */
function topLevelBlocks(editor: Editor): { pos: number; size: number }[] {
  const blocks: { pos: number; size: number }[] = [];
  editor.state.doc.forEach((node, offset) => {
    blocks.push({ pos: offset, size: node.nodeSize });
  });
  return blocks;
}

function elementFor(editor: Editor, pos: number): HTMLElement | null {
  const dom = editor.view.nodeDOM(pos);
  return dom instanceof HTMLElement ? dom : null;
}

/**
 * The first block at or after `from` that has an element to measure, and its
 * bottom edge — searching forward first, then back towards `low`.
 *
 * Not every top-level position answers with an `HTMLElement`: `nodeDOM` returns
 * whatever the node view put there, and a decoration wrapper or a text node is
 * not measurable. The linear scan this replaced simply skipped those; a binary
 * search cannot, because it must decide at the position it probes. So it
 * steps to the nearest block that CAN be measured and decides from that one,
 * which is sound for the same reason the search is: the blocks it stepped over
 * lie on the same side of the fold as the one it landed on.
 */
function measurableNear(
  editor: Editor,
  blocks: { pos: number }[],
  from: number,
  low: number,
  high: number
): { index: number; bottom: number } | null {
  for (let i = from; i <= high; i += 1) {
    const rect = elementFor(editor, blocks[i].pos)?.getBoundingClientRect();
    if (rect) return { index: i, bottom: rect.bottom };
  }
  for (let i = from - 1; i >= low; i -= 1) {
    const rect = elementFor(editor, blocks[i].pos)?.getBoundingClientRect();
    if (rect) return { index: i, bottom: rect.bottom };
  }
  return null;
}

/** The top-level block the author is looking at, or typing in. */
export function readEditorBlock(
  editor: Editor,
  viewport: HTMLElement | null
): number {
  const blocks = topLevelBlocks(editor);
  if (!blocks.length) return 0;
  if (!viewport) return 0;

  const frame = viewport.getBoundingClientRect();

  const caretIndex = editor.state.selection.$from.index(0);
  if (caretIndex >= 0 && caretIndex < blocks.length) {
    const element = elementFor(editor, blocks[caretIndex].pos);
    const rect = element?.getBoundingClientRect();
    // In view, so the caret is what the author is working on.
    if (rect && rect.bottom > frame.top && rect.top < frame.bottom) {
      return caretIndex;
    }
  }

  /*
   * The topmost block still on screen, found by bisection.
   *
   * "A block still crossing the top edge is the one being read, not the next"
   * — so the answer is the FIRST block whose bottom is below the viewport's
   * top edge, and `bottom` only ever increases down the document, which is
   * what makes a binary search legal here. (Only ever: these are the doc's
   * top-level children, laid out in flow. Nothing in this schema floats or is
   * positioned out of it.)
   *
   * It used to be a linear scan, and every step of it read
   * `getBoundingClientRect()` — a forced layout each, in one uninterrupted
   * burst. Toggling mode near the end of a 3,797-node note therefore measured
   * every block above the caret before it found one on screen; bisection asks
   * for ~12 rects instead of ~2,000. This runs once per toggle, so what it
   * costs is a visible hitch on the switch rather than a per-frame drag.
   */
  let low = 0;
  let high = blocks.length - 1;
  let topmost = blocks.length - 1;

  while (low <= high) {
    const probe = measurableNear(
      editor,
      blocks,
      Math.floor((low + high) / 2),
      low,
      high
    );
    // Nothing left in this range can be measured, so there is nothing further
    // to learn — keep the best answer found so far.
    if (!probe) break;

    if (probe.bottom > frame.top + 1) {
      topmost = probe.index;
      high = probe.index - 1;
    } else {
      low = probe.index + 1;
    }
  }

  return topmost;
}

/** Puts the caret in `block` and brings it to the top of the viewport. */
export function applyEditorBlock(
  editor: Editor,
  viewport: HTMLElement | null,
  block: number
): void {
  const blocks = topLevelBlocks(editor);
  if (!blocks.length) return;

  const target = blocks[Math.max(0, Math.min(block, blocks.length - 1))];

  // `TextSelection.near`, not `pos + 1`: a top-level atom (an image row, the
  // bibliography) has no position inside it to select, and asking for one
  // throws rather than degrading.
  const { state, view } = editor;
  const selection = TextSelection.near(state.doc.resolve(target.pos));
  view.dispatch(state.tr.setSelection(selection));

  const element = elementFor(editor, target.pos);
  if (viewport && element) {
    // Scrolled by hand rather than with `scrollIntoView`, which would also
    // scroll every ancestor — including the page behind the editor.
    viewport.scrollTop +=
      element.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top;
  }

  view.focus();
}

/**
 * The markdown line the author is on.
 *
 * `viewport`, not the textarea, is what scrolls: the pane is `min-h-full` and
 * grows to its content inside the shared `overflow-y-auto` column, so
 * `textarea.scrollTop` is permanently 0. Reading it instead — which this did
 * at first — makes every switch out of markdown mode report line 0 and land
 * the editor at the top of the document.
 *
 * Position is then estimated from the CHARACTER offset rather than measured: a
 * textarea offers no way to ask which line sits at the top of a scrollport,
 * and the alternative — mirroring the whole text into a hidden div to measure
 * it — is a lot of machinery for a monospace pane where height and character
 * count track each other closely.
 *
 * The offset becomes a line number through `map.lineOffset`, which is a sorted
 * array and so answers by bisection. This used to count `\n` from the start of
 * the text on every call, and the call is a SCROLL handler: the 350KB note put
 * up to ~300,000 iterations between the browser and each frame it wanted to
 * paint. The map is the same one `applyTextareaLine` already trusts for the
 * opposite direction, and it is built from the very markdown the pane was
 * seeded with — it can only drift by what the author has typed since, which
 * moves the estimate by less than the proportional guess above already does.
 */
export function readTextareaLine(
  textarea: HTMLTextAreaElement,
  viewport: HTMLElement | null,
  map: MarkdownAnchorMap | null
): number {
  const text = textarea.value;
  const length = Math.max(1, text.length);
  const caret = textarea.selectionStart ?? 0;

  let offset = caret;

  const scrollable =
    viewport && viewport.scrollHeight > viewport.clientHeight + 1;

  if (scrollable) {
    const top = viewport.scrollTop / viewport.scrollHeight;
    const bottom =
      (viewport.scrollTop + viewport.clientHeight) / viewport.scrollHeight;
    const caretAt = caret / length;

    // The caret has been scrolled away from, so the author is reading rather
    // than typing: anchor on what is on screen instead.
    if (caretAt < top || caretAt > bottom) offset = Math.round(top * length);
  }

  // No map means the pane was never opened through the mode effect, which is
  // the only thing that builds one. Nothing to translate the offset with, and
  // guessing would move the author somewhere they did not ask to be.
  if (!map) return 0;
  return lineAtOffset(map, offset);
}

/** Puts the caret on `line` and scrolls the pane to it. */
export function applyTextareaLine(
  textarea: HTMLTextAreaElement,
  viewport: HTMLElement | null,
  map: MarkdownAnchorMap,
  line: number
): void {
  const index = Math.max(0, Math.min(line, map.lineOffset.length - 1));
  const offset = map.lineOffset[index] ?? 0;
  const length = Math.max(1, textarea.value.length);

  textarea.setSelectionRange(offset, offset);
  // `preventScroll`, because the scroll is set below from the same offset the
  // caret came from. Letting the browser scroll the caret into view instead
  // would put the line wherever the shortest correction happens to leave it —
  // usually pinned to the bottom edge, coming from a cold scroll position.
  textarea.focus({ preventScroll: true });

  if (!viewport) return;
  viewport.scrollTop = Math.min(
    (offset / length) * viewport.scrollHeight,
    Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  );
}

/** Builds the map for the editor's current document and its markdown. */
export function anchorMapFor(
  editor: Editor,
  markdown: string
): MarkdownAnchorMap {
  // `editor.markdown` is installed by the Markdown extension, which this
  // editor always registers — but it is optional on the type, and a serializer
  // that is not there must degrade to "no map" rather than throw during a
  // mode switch.
  const manager = editor.markdown;

  return buildMarkdownAnchorMap(editor.getJSON(), markdown, (block) =>
    manager ? manager.serialize({ type: 'doc', content: [block] }) : ''
  );
}

export { blockAtLine, lineAtOffset };
export type { MarkdownAnchorMap };
