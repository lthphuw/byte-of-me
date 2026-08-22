import type { JSONContent } from '@tiptap/core';

/**
 * The map that lets the WYSIWYG editor and the raw-markdown pane agree on
 * where "here" is when an author toggles between them.
 *
 * The two views share one scroll container, so today `scrollTop` carries over
 * literally — and lands somewhere else entirely, because a table that occupies
 * 800px of rendered editor is forty lines of monospace source. What they DO
 * share is the document's top-level blocks, so a block index is the anchor.
 *
 * Not a character offset, and this is a real limit rather than an omission:
 * the markdown is SERIALIZED from the document, and the serializer emits no
 * position map. There is no way back from "character 4,812 of the markdown" to
 * a document position — `**bold**`, `[text](url)` and a table's pipes are all
 * produced text with no record of what produced them. Anchoring finer than a
 * block would mean writing a serializer that carries a mapping, which is a
 * different and much larger piece of work.
 */

export interface MarkdownAnchorMap {
  /** First markdown line (0-based) of each top-level block. */
  startLine: number[];
  /** Character offset at which each markdown line starts. */
  lineOffset: number[];
  /**
   * How the map was derived. `blocks` is exact; `headings` means the
   * per-block line counts did not add up to the real markdown and the map was
   * rebuilt from the headings alone, interpolating in between.
   */
  basis: 'blocks' | 'headings';
}

/** Character offset of the start of every line in `text`. */
function lineOffsetsOf(text: string): number[] {
  const offsets = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') offsets.push(i + 1);
  }
  return offsets;
}

function countLines(text: string): number {
  if (!text) return 0;
  let lines = 1;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') lines += 1;
  }
  return lines;
}

/** The text of a node tree, for matching a heading against its markdown line. */
function textOf(node: JSONContent): string {
  if (typeof node.text === 'string') return node.text;
  if (!node.content) return '';
  return node.content.map(textOf).join('');
}

/**
 * Rebuilds the map from headings when the per-block counts do not add up.
 *
 * A heading is the one block whose markdown line can be found without trusting
 * the serializer's line accounting: it is a line starting with the right number
 * of `#` followed by its own text. Blocks between two headings are spread
 * evenly across the lines between them — coarse, but it cannot land in the
 * wrong section, which is the failure that matters.
 */
function headingBasedMap(
  blocks: JSONContent[],
  lines: string[]
): number[] | null {
  const anchors: { block: number; line: number }[] = [];
  let searchFrom = 0;

  blocks.forEach((block, index) => {
    if (block.type !== 'heading') return;

    const level = Number(block.attrs?.level) || 1;
    const wanted = `${'#'.repeat(level)} ${textOf(block).trim()}`;

    for (let line = searchFrom; line < lines.length; line += 1) {
      if (lines[line].trim() === wanted) {
        anchors.push({ block: index, line });
        searchFrom = line + 1;
        return;
      }
    }
  });

  if (!anchors.length) return null;

  const startLine = new Array<number>(blocks.length).fill(0);
  let previous = { block: -1, line: 0 };

  for (const anchor of [...anchors, { block: blocks.length, line: lines.length }]) {
    const span = anchor.block - previous.block;
    for (let i = previous.block + 1; i <= anchor.block && i < blocks.length; i += 1) {
      const through = (i - previous.block) / span;
      startLine[i] = Math.round(
        previous.line + through * (anchor.line - previous.line)
      );
    }
    previous = anchor;
  }

  return startLine;
}

/**
 * Builds the block-to-line map for `markdown`, the serialization of `doc`.
 *
 * Each block is serialized on its own and its lines counted. That is O(n)
 * rather than the O(n²) of serializing every prefix — but a block serialized
 * out of context can differ from the same block inside the document (an
 * ordered list that continues a count, a list that is tight in one place and
 * loose in another). So the total is checked against the real markdown, and a
 * disagreement falls back to headings rather than quietly scrolling to the
 * wrong place.
 */
export function buildMarkdownAnchorMap(
  doc: JSONContent,
  markdown: string,
  serializeBlock: (block: JSONContent) => string
): MarkdownAnchorMap {
  const blocks = doc.content ?? [];
  const lines = markdown.split('\n');
  const lineOffset = lineOffsetsOf(markdown);

  const startLine: number[] = [];
  let cursor = 0;

  for (const block of blocks) {
    startLine.push(cursor);
    let serialized = '';
    try {
      serialized = serializeBlock(block);
    } catch {
      // One unserializable block must not cost the whole map.
      serialized = '';
    }
    // Blocks are separated by a blank line, hence the `+ 1`.
    cursor += countLines(serialized.replace(/\n+$/, '')) + 1;
  }

  // `cursor` has counted one separator past the last block.
  const predicted = Math.max(0, cursor - 1);
  const actual = lines.length;

  // A line or two of slack: a trailing newline, a serializer that pads one
  // construct differently. Anything more and the map is not describing this
  // document.
  if (blocks.length && Math.abs(predicted - actual) > 2) {
    const fallback = headingBasedMap(blocks, lines);
    if (fallback) return { startLine: fallback, lineOffset, basis: 'headings' };
  }

  return {
    startLine: startLine.map((line) => Math.min(line, Math.max(0, actual - 1))),
    lineOffset,
    basis: 'blocks',
  };
}

/** The block that owns `line` — the last one that starts at or before it. */
export function blockAtLine(map: MarkdownAnchorMap, line: number): number {
  const { startLine } = map;
  if (!startLine.length) return 0;

  let low = 0;
  let high = startLine.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (startLine[mid] <= line) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** The line `offset` falls on. */
export function lineAtOffset(map: MarkdownAnchorMap, offset: number): number {
  const { lineOffset } = map;
  let low = 0;
  let high = lineOffset.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lineOffset[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
}
