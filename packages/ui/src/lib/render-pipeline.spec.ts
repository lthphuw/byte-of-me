// The `/server` entry is the node build — same output, no DOM requirement.
import { generateHTML } from '@tiptap/html/server';

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
      content: [{ type: 'text', text: 'pnpm check' }],
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

  it('keeps the language class mermaid enhancement keys on', () => {
    expect(html).toContain('language-mermaid');
    expect(html).toContain('flowchart TB');
  });

  it('highlights a registered common language', () => {
    // lowlight(common) marks tokens with hljs- classes at render time.
    expect(html).toContain('language-bash');
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
