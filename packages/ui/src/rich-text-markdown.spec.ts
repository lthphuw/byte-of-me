import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'bun:test';

import { parseMarkdownToTiptap } from './rich-text-markdown';
import { renderRichTextHtml } from './rich-text-render';

/** Every node/mark type present in a document, for coarse structure asserts. */
function typesIn(doc: JSONContent): Set<string> {
  const found = new Set<string>();
  const walk = (node: JSONContent): void => {
    if (node.type) found.add(node.type);
    for (const mark of node.marks ?? []) found.add(`mark:${mark.type}`);
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return found;
}

/** The first node of `type` found anywhere in the document. */
function firstOfType(doc: JSONContent, type: string): JSONContent | null {
  if (doc.type === type) return doc;
  for (const child of doc.content ?? []) {
    const hit = firstOfType(child, type);
    if (hit) return hit;
  }
  return null;
}

describe('parseMarkdownToTiptap', () => {
  it('keeps a relative link href verbatim, for the publisher to rewrite later', () => {
    const doc = parseMarkdownToTiptap('See [exp 1](./experiments/exp-001.md).');
    const html = renderRichTextHtml(JSON.stringify(doc));
    expect(html).toContain('href="./experiments/exp-001.md"');
  });

  it('parses tables and keeps a fenced language for the mermaid enhancer', () => {
    const doc = parseMarkdownToTiptap(
      '| a | b |\n| --- | --- |\n| 1 | 2 |\n\n```mermaid\ngraph TD; A-->B;\n```\n'
    );
    expect(typesIn(doc).has('table')).toBe(true);
    expect(firstOfType(doc, 'codeBlock')?.attrs?.language).toBe('mermaid');
  });

  it('turns $…$ into an inlineMath node carrying the latex', () => {
    const doc = parseMarkdownToTiptap('The loss $\\mathcal{L}_{cls}$ dominates.');
    const math = firstOfType(doc, 'inlineMath');
    expect(math?.attrs?.latex).toBe('\\mathcal{L}_{cls}');
    // The delimiters must not survive as text.
    expect(JSON.stringify(doc)).not.toContain('$\\\\mathcal');
  });

  it('turns a standalone $$…$$ into a blockMath node', () => {
    const doc = parseMarkdownToTiptap('Before\n\n$$\nE = mc^2\n$$\n\nAfter');
    const math = firstOfType(doc, 'blockMath');
    expect(math?.attrs?.latex).toBe('E = mc^2');
    expect(typesIn(doc).has('blockMath')).toBe(true);
  });

  it('leaves currency alone', () => {
    // `$5 and $10` must not become math. An opening delimiter followed by a
    // digit is the discriminator.
    const doc = parseMarkdownToTiptap('It cost $5 and then $10 more.');
    expect(typesIn(doc).has('inlineMath')).toBe(false);
    expect(JSON.stringify(doc)).toContain('$5 and then $10 more.');
  });

  it('produces a document the app can actually render', () => {
    const doc = parseMarkdownToTiptap('# H\n\nText with $x^2$ and a table:\n\n| a |\n| --- |\n| 1 |\n');
    const html = renderRichTextHtml(JSON.stringify(doc));
    // renderRichTextHtml returns '' when generateHTML throws on an unknown
    // node — a non-empty string is the real assertion here.
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('data-type="inline-math"');
  });
});
