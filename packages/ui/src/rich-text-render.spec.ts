/**
 * The render entry points the public site uses. `renderRichTextDocumentHtml`
 * reports a value it cannot draw as null, so a caller can print nothing. The
 * other entry point, `renderRichTextHtml`, keeps its escaped-text fallback.
 */
import { describe, expect, it } from 'bun:test';

import {
  renderRichTextDocumentHtml,
  renderRichTextHtml,
} from './rich-text-render';

const docOf = (...content: unknown[]) =>
  JSON.stringify({ type: 'doc', content });

describe('renderRichTextDocumentHtml', () => {
  it('renders a document to HTML', () => {
    const html = renderRichTextDocumentHtml(
      docOf({
        type: 'paragraph',
        content: [{ type: 'text', text: 'How it was done.' }],
      })
    );

    expect(html).toBe('<p>How it was done.</p>');
  });

  it('renders headings and lists inside a document', () => {
    const html = renderRichTextDocumentHtml(
      docOf(
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Results' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Faster' }],
                },
              ],
            },
          ],
        }
      )
    );

    expect(html).toContain('Results');
    expect(html).toContain('<li>');
    expect(html).toContain('Faster');
  });

  it('reports a node type the render schema does not know as null', () => {
    expect(renderRichTextDocumentHtml(docOf({ type: 'bogus' }))).toBeNull();
  });

  it('reports a value that is not a document as null', () => {
    expect(renderRichTextDocumentHtml('{"type":')).toBeNull();
    expect(renderRichTextDocumentHtml('42')).toBeNull();
  });

  it('sanitizes what it renders', () => {
    const html = renderRichTextDocumentHtml(
      docOf({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'click',
            marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
          },
        ],
      })
    );

    expect(html).toContain('click');
    expect(html).not.toContain('javascript:');
  });
});

describe('renderRichTextHtml', () => {
  it('returns an empty string for empty input', () => {
    expect(renderRichTextHtml('')).toBe('');
    expect(renderRichTextHtml(null)).toBe('');
  });

  it('escapes legacy plain text rather than printing it as markup', () => {
    const html = renderRichTextHtml('plain <script>alert(1)</script> text');

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script');
  });

  it('keeps the escaped fallback for a document it cannot draw', () => {
    // Other callers keep their behaviour: the failure is escaped, not thrown.
    const html = renderRichTextHtml(docOf({ type: 'bogus' }));

    expect(html).not.toContain('<bogus');
    expect(html).toContain('&quot;type&quot;');
  });
});
