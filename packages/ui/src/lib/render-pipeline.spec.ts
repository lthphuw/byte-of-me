// The `/server` entry is the node build — same output, no DOM requirement.
import { generateHTML } from '@tiptap/html/server';
import { describe, expect, it } from 'bun:test';

import { renderExtensions } from '../rich-text-editor/tiptap/render-extensions';

import { sanitizeHtml } from './sanitize';

/**
 * Guards the invariant behind docs-style posts: every node the editor can
 * persist must survive generateHTML → sanitizeHtml with its semantics intact.
 */

const cell = (type: 'tableCell' | 'tableHeader', text: string) => ({
  type,
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const doc = {
  type: 'doc',
  content: [
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [cell('tableHeader', 'Layer'), cell('tableHeader', 'Scope')],
        },
        {
          type: 'tableRow',
          content: [cell('tableCell', 'Edge'), cell('tableCell', 'Public HTML')],
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'mermaid' },
      content: [{ type: 'text', text: 'flowchart TB\n  A --> B' }],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'bash' },
      content: [{ type: 'text', text: 'bun run check' }],
    },
  ],
};

describe('render pipeline (generateHTML → sanitizeHtml)', () => {
  const html = sanitizeHtml(generateHTML(doc, renderExtensions));

  it('renders tables with header cells', () => {
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('Layer');
    expect(html).toContain('<td');
    expect(html).toContain('Public HTML');
  });

  it('wraps a table in the scroll container the styles hang off', () => {
    // `.tableWrapper` is the horizontal scroll area for wide tables, and the
    // same class the editor's own node view creates — without it in the
    // rendered HTML, published tables have no scroll container at all and the
    // rules in `rich-text-html.tsx` match nothing.
    expect(html).toContain('class="tableWrapper"');
    expect(html).toMatch(/<div class="tableWrapper"><table/);
  });

  it('keeps the language class mermaid enhancement keys on', () => {
    expect(html).toContain('language-mermaid');
    expect(html).toContain('flowchart TB');
  });

  it('highlights a registered common language', () => {
    // lowlight(common) marks tokens with hljs- classes at render time.
    expect(html).toContain('language-bash');
  });

  it('renders a captioned image as a figure with a real figcaption', () => {
    const captioned = sanitizeHtml(
      generateHTML(
        {
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: { src: 'https://example.test/a.png', alt: 'A', caption: 'Fig 1' },
            },
          ],
        },
        renderExtensions
      )
    );

    expect(captioned).toContain('<figure');
    expect(captioned).toContain('<figcaption');
    expect(captioned).toContain('Fig 1');
    expect(captioned).toContain('<img');
  });

  it('leaves an image with no caption as the bare img it has always been', () => {
    // Every document already in the database is this shape. The figure wrapper
    // must be additive, not a rewrite of what is stored.
    const plain = sanitizeHtml(
      generateHTML(
        {
          type: 'doc',
          content: [
            { type: 'image', attrs: { src: 'https://example.test/a.png', alt: 'A' } },
          ],
        },
        renderExtensions
      )
    );

    expect(plain).toContain('<img');
    expect(plain).not.toContain('<figure');
    expect(plain).not.toContain('<figcaption');
  });

  it('renders a row of images as one figure, with the caption outside the row', () => {
    // The whole reason `render-extensions.ts` shares the editor's node
    // definitions: a node the editor can persist but the render schema does
    // not know makes `generateHTML` throw, and `renderRichTextHtml` then falls
    // back to escaping — blanking the document, not just the images.
    const row = sanitizeHtml(
      generateHTML(
        {
          type: 'doc',
          content: [
            {
              type: 'imageGroup',
              attrs: { caption: 'Before and after' },
              content: [
                { type: 'image', attrs: { src: 'https://example.test/a.png', alt: 'A' } },
                { type: 'image', attrs: { src: 'https://example.test/b.png', alt: 'B' } },
              ],
            },
          ],
        },
        renderExtensions
      )
    );

    expect(row).toContain('class="image-group"');
    expect(row).toContain('class="image-group-items"');
    expect(row.match(/<img/g)).toHaveLength(2);
    expect(row.match(/<figcaption/g)).toHaveLength(1);
    expect(row).toContain('Before and after');
    // The caption describes the row, so it must sit after the images rather
    // than inside the element that lays them out side by side.
    expect(row.indexOf('<figcaption')).toBeGreaterThan(row.lastIndexOf('<img'));
  });

  it('does not throw on a doc using every base node', () => {
    const full = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'p' }] },
        { type: 'horizontalRule' },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'li' }] }],
            },
          ],
        },
      ],
    };
    expect(() => generateHTML(full, renderExtensions)).not.toThrow();
  });
});
