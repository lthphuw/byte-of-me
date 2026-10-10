// Server-side only: pulls in `generateHTML` and the full extension schema
// (tiptap + prosemirror + lowlight ≈ 1 MB). Import it from server components
// and server actions, never from client code — a client that needs rendered
// rich text should receive the HTML produced here and print it with
// `RichTextHtml`.
import type { JSONContent } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';

import { escapeHtml, sanitizeHtml } from './lib/sanitize';
import { markNumericTableColumns } from './rich-text-editor/tiptap/extensions/numeric-columns';
import { applyCitationNumbering } from './rich-text-editor/tiptap/extensions/references/numbering';
import { renderExtensions } from './rich-text-editor/tiptap/render-extensions';

/**
 * Tiptap JSON (a stored string or an already-parsed object) to unsanitized HTML,
 * or null when it is not a document the render schema can draw. A throw is the
 * only failure signal: an unknown node type, a malformed `content` and a doc
 * whose serializer fails all land here.
 */
function generateDocumentHtml(content: unknown): string | null {
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    // Citation numbers and numeric table columns are both derived from the
    // document rather than stored, so both are baked in here, right before the
    // markup is produced.
    return generateHTML(
      markNumericTableColumns(applyCitationNumbering(json as JSONContent)),
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
export function renderRichTextHtml(content?: string | unknown): string {
  if (!content) return '';

  // Not Tiptap JSON — treat as untrusted plain text and escape it. Never
  // pass free-form input through as raw HTML (stored-XSS vector).
  const html =
    generateDocumentHtml(content) ??
    escapeHtml(typeof content === 'string' ? content : '');

  return sanitizeHtml(html);
}
