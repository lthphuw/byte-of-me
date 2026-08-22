import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'bun:test';

import {
  blockAtLine,
  buildMarkdownAnchorMap,
  lineAtOffset,
} from './markdown-anchor';

const heading = (level: number, text: string): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});

const paragraph = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

/** A stand-in serializer with the shape the real one has. */
const serializeBlock = (block: JSONContent): string => {
  if (block.type === 'heading') {
    const level = Number(block.attrs?.level) || 1;
    return `${'#'.repeat(level)} ${block.content?.[0]?.text ?? ''}`;
  }
  if (block.type === 'codeBlock') {
    return `\`\`\`\n${block.content?.[0]?.text ?? ''}\n\`\`\``;
  }
  return String(block.content?.[0]?.text ?? '');
};

const docOf = (blocks: JSONContent[]): JSONContent => ({
  type: 'doc',
  content: blocks,
});

/** What the serializer above would produce for the whole document. */
const markdownOf = (blocks: JSONContent[]): string =>
  blocks.map(serializeBlock).join('\n\n');

describe('buildMarkdownAnchorMap', () => {
  it('puts each block on the line its markdown starts', () => {
    const blocks = [
      heading(1, 'Title'),
      paragraph('First paragraph.'),
      heading(2, 'Section'),
      paragraph('Second paragraph.'),
    ];
    const markdown = markdownOf(blocks);

    const map = buildMarkdownAnchorMap(
      docOf(blocks),
      markdown,
      serializeBlock
    );

    expect(map.basis).toBe('blocks');
    expect(map.startLine).toEqual([0, 2, 4, 6]);

    // The lines it names really are those blocks.
    const lines = markdown.split('\n');
    expect(lines[map.startLine[0]]).toBe('# Title');
    expect(lines[map.startLine[2]]).toBe('## Section');
  });

  it('counts a block that spans several lines', () => {
    const blocks = [
      paragraph('Intro.'),
      { type: 'codeBlock', content: [{ type: 'text', text: 'a\nb' }] },
      paragraph('Outro.'),
    ];
    const markdown = markdownOf(blocks);

    const map = buildMarkdownAnchorMap(docOf(blocks), markdown, serializeBlock);

    // ```/a/b/``` is four lines, plus the blank line after it.
    expect(map.startLine).toEqual([0, 2, 7]);
    expect(markdown.split('\n')[7]).toBe('Outro.');
  });

  it('records where every line begins', () => {
    const map = buildMarkdownAnchorMap(
      docOf([paragraph('ab'), paragraph('cd')]),
      'ab\n\ncd',
      serializeBlock
    );

    expect(map.lineOffset).toEqual([0, 3, 4]);
  });

  describe('when the per-block counts do not add up', () => {
    // A serializer that pads one construct differently in context is exactly
    // the drift the fallback exists for.
    // The extra lines are INTERNAL, not trailing: a trailing newline is
    // stripped before counting, precisely because real serializers add one.
    const liar = (block: JSONContent): string =>
      block.type === 'paragraph'
        ? `${serializeBlock(block)}\n\n\nand more\n\n\nand more`
        : serializeBlock(block);

    const blocks = [
      heading(1, 'Title'),
      paragraph('One.'),
      paragraph('Two.'),
      heading(2, 'Section'),
      paragraph('Three.'),
    ];

    it('falls back to the headings rather than trusting a wrong map', () => {
      const markdown = markdownOf(blocks);
      const map = buildMarkdownAnchorMap(docOf(blocks), markdown, liar);

      expect(map.basis).toBe('headings');

      // The headings land exactly; that is what the fallback guarantees.
      const lines = markdown.split('\n');
      expect(lines[map.startLine[0]]).toBe('# Title');
      expect(lines[map.startLine[3]]).toBe('## Section');
    });

    it('keeps the blocks between two headings in order', () => {
      const map = buildMarkdownAnchorMap(
        docOf(blocks),
        markdownOf(blocks),
        liar
      );

      for (let i = 1; i < map.startLine.length; i += 1) {
        expect(map.startLine[i]).toBeGreaterThanOrEqual(map.startLine[i - 1]);
      }
    });

    it('keeps the exact map when there is no heading to fall back to', () => {
      // Nothing better is available, so a rough map beats no map: the caller
      // still lands in the right half of the document.
      const only = [paragraph('One.'), paragraph('Two.')];
      const map = buildMarkdownAnchorMap(docOf(only), markdownOf(only), liar);
      expect(map.basis).toBe('blocks');
    });
  });

  it('never names a line past the end of the markdown', () => {
    const blocks = [paragraph('One.'), paragraph('Two.'), paragraph('Three.')];
    const markdown = markdownOf(blocks);
    const map = buildMarkdownAnchorMap(docOf(blocks), markdown, () => 'x');

    const lastLine = markdown.split('\n').length - 1;
    for (const line of map.startLine) {
      expect(line).toBeLessThanOrEqual(lastLine);
    }
  });

  it('handles an empty document', () => {
    const map = buildMarkdownAnchorMap(docOf([]), '', serializeBlock);
    expect(map.startLine).toEqual([]);
  });
});

describe('blockAtLine', () => {
  const map = {
    startLine: [0, 2, 4, 10],
    lineOffset: [],
    basis: 'blocks' as const,
  };

  it('finds the block a line belongs to', () => {
    expect(blockAtLine(map, 0)).toBe(0);
    expect(blockAtLine(map, 1)).toBe(0);
    expect(blockAtLine(map, 2)).toBe(1);
    expect(blockAtLine(map, 5)).toBe(2);
    expect(blockAtLine(map, 9)).toBe(2);
    expect(blockAtLine(map, 10)).toBe(3);
  });

  it('clamps past either end', () => {
    expect(blockAtLine(map, -5)).toBe(0);
    expect(blockAtLine(map, 9999)).toBe(3);
  });
});

describe('lineAtOffset', () => {
  const map = {
    startLine: [],
    lineOffset: [0, 3, 4, 12],
    basis: 'blocks' as const,
  };

  it('finds the line an offset falls on', () => {
    expect(lineAtOffset(map, 0)).toBe(0);
    expect(lineAtOffset(map, 2)).toBe(0);
    expect(lineAtOffset(map, 3)).toBe(1);
    expect(lineAtOffset(map, 11)).toBe(2);
    expect(lineAtOffset(map, 50)).toBe(3);
  });
});
