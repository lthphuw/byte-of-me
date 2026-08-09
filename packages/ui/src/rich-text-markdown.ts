// Server-side only: pulls in the full extension schema plus marked, the same
// weight as `rich-text-render.ts` and for the same reason. Import it from
// route handlers and server actions, never from client code.
//
// `renderExtensions` is imported by relative path on purpose — it is not on
// the package's export map, and `rich-text-render.ts` reaches it the same way.
import type { JSONContent } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';

import { renderExtensions } from './rich-text-editor/tiptap/render-extensions';

/**
 * One manager for the process. Construction registers every extension and
 * builds a marked instance; `parse` holds no state between calls.
 */
const manager = new MarkdownManager({ extensions: renderExtensions });

/**
 * Inline math: `$…$`.
 *
 * The opening delimiter must not be followed by a digit or whitespace, and the
 * closing one must not be preceded by whitespace. That is what keeps `$5 and
 * $10 more` out of the math schema — a real formula effectively never opens
 * with a bare digit, and prices always do. Without the guard, every price in a
 * cost table becomes a broken equation.
 */
const INLINE_MATH = /\$(?![\s\d])([^$\n]*[^$\s])\$/g;

/** Block math: `$$…$$`, the whole of a paragraph. */
const BLOCK_MATH = /^\$\$([\s\S]+?)\$\$$/;

/**
 * Math survives markdown as literal text.
 *
 * `@tiptap/markdown` has no handler for the two math nodes — they are Tiptap
 * nodes defined in this package, not a markdown construct marked knows — so a
 * parsed document carries `$x^2$` as characters. Rewriting the *parsed tree*
 * rather than pre-processing the markdown string means the delimiters are only
 * interpreted in real text nodes: a `$` inside a fenced code block or an inline
 * code span is never reached, because those are not text nodes with marks this
 * walk descends into.
 */
function applyMath(node: JSONContent): JSONContent {
  if (!node.content) return node;

  const content: JSONContent[] = [];

  for (const child of node.content) {
    // A paragraph that is nothing but `$$…$$` becomes a block equation.
    if (child.type === 'paragraph' && child.content?.length === 1) {
      const only = child.content[0];
      const blockMatch =
        only?.type === 'text' && typeof only.text === 'string'
          ? BLOCK_MATH.exec(only.text.trim())
          : null;

      if (blockMatch) {
        content.push({ type: 'blockMath', attrs: { latex: blockMatch[1].trim() } });
        continue;
      }
    }

    if (child.type === 'text' && typeof child.text === 'string') {
      content.push(...splitInlineMath(child));
      continue;
    }

    content.push(applyMath(child));
  }

  return { ...node, content };
}

/** One text node in, a mix of text and `inlineMath` nodes out. */
function splitInlineMath(node: JSONContent): JSONContent[] {
  const text = node.text ?? '';
  INLINE_MATH.lastIndex = 0;

  const parts: JSONContent[] = [];
  let cursor = 0;

  for (let match = INLINE_MATH.exec(text); match; match = INLINE_MATH.exec(text)) {
    if (match.index > cursor) {
      parts.push({ ...node, text: text.slice(cursor, match.index) });
    }
    // Marks are dropped on the math node itself: it is an atom, and a bold
    // formula is not a thing the editor can produce either.
    parts.push({ type: 'inlineMath', attrs: { latex: match[1] } });
    cursor = match.index + match[0].length;
  }

  if (parts.length === 0) return [node];
  if (cursor < text.length) parts.push({ ...node, text: text.slice(cursor) });

  return parts;
}

/**
 * A markdown document as Tiptap JSON, using the same schema the app renders
 * with — so a published document is indistinguishable from one typed into the
 * editor.
 *
 * Two known lossy points, both deliberate. Task lists (`- [ ]`) arrive as
 * plain bullets with the checked state gone, which is why the R&D format bans
 * them outright rather than accepting a silent downgrade. And `listItem`
 * holds text directly rather than wrapping it in a paragraph; `generateHTML`
 * accepts that, verified against `renderRichTextHtml`.
 */
export function parseMarkdownToTiptap(markdown: string): JSONContent {
  return applyMath(manager.parse(markdown));
}
