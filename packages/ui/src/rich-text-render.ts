// Server-side only: pulls in `generateHTML` and the full extension schema (tiptap + prosemirror +
// lowlight ≈ 1 MB). The schema is imported by direct path, never `./rich-text-editor`: that entry
// is 'use client' and would ship the whole editor (~380 KB) with every page that renders rich text.
import { generateHTML } from '@tiptap/html';

import { type ImageSizes, withImageRatios } from './lib/image-ratios';
import { parseRichTextContent } from './lib/rich-text-content';
import { escapeHtml, sanitizeHtml } from './lib/sanitize';
import { markNumericTableColumns } from './rich-text-editor/tiptap/extensions/numeric-columns';
import { applyCitationNumbering } from './rich-text-editor/tiptap/extensions/references/numbering';
import { renderExtensions } from './rich-text-editor/tiptap/render-extensions';

/**
 * Tiptap JSON (stored string or parsed object) to unsanitized HTML, or null when the render
 * schema cannot draw it. A throw is the only failure signal (unknown node, bad `content`).
 */
function generateDocumentHtml(content: unknown): string | null {
  const json = parseRichTextContent(content);
  if (!json) return null;

  try {
    // Citation numbers and numeric table columns are derived from the document, not stored,
    // so both are baked in here, right before the markup is produced.
    return generateHTML(
      markNumericTableColumns(applyCitationNumbering(json)),
      renderExtensions
    );
  } catch {
    return null;
  }
}

/**
 * Sanitized HTML of a stored Tiptap document, or null when the value does not
 * render as one. Use this where a failed render must not print anything: a
 * caller that falls back to text would otherwise show the raw JSON.
 */
export function renderRichTextDocumentHtml(content: unknown): string | null {
  const html = generateDocumentHtml(content);
  return html === null ? null : sanitizeHtml(html);
}

/**
 * Turns a stored rich text value (stringified Tiptap document, or legacy plain
 * text) into sanitized HTML ready for `RichTextHtml` /
 * `dangerouslySetInnerHTML`. Returns an empty string for empty input.
 */
export function renderRichTextHtml(
  content?: string | unknown,
  options?: { imageSizes?: ImageSizes }
): string {
  if (!content) return '';

  // Not Tiptap JSON — treat as untrusted plain text and escape it. Never
  // pass free-form input through as raw HTML (stored-XSS vector).
  const html =
    generateDocumentHtml(content) ??
    escapeHtml(typeof content === 'string' ? content : '');

  // The stored sizes go in after sanitizing: they are the only style the page gets.
  return withImageRatios(sanitizeHtml(html), options?.imageSizes);
}
