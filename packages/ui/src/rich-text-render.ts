// Server-side only: pulls in `generateHTML` and the full extension schema
// (tiptap + prosemirror + lowlight ≈ 1 MB). Import it from server components
// and server actions, never from client code — a client that needs rendered
// rich text should receive the HTML produced here and print it with
// `RichTextHtml`.
import type { JSONContent } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';

import { escapeHtml, sanitizeHtml } from './lib/sanitize';
import { applyCitationNumbering } from './rich-text-editor/tiptap/extensions/references/numbering';
import { renderExtensions } from './rich-text-editor/tiptap/render-extensions';

/**
 * Turns a stored rich text value (stringified Tiptap document, or legacy plain
 * text) into sanitized HTML ready for `RichTextHtml` /
 * `dangerouslySetInnerHTML`. Returns an empty string for empty input.
 */
export function renderRichTextHtml(content?: string | unknown): string {
  if (!content) return '';

  let htmlContent = '';

  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    // Citation numbers are derived from the document, not stored, so they are
    // baked in here right before the markup is produced.
    htmlContent = generateHTML(
      applyCitationNumbering(json as JSONContent),
      renderExtensions
    );
  } catch {
    // Not Tiptap JSON — treat as untrusted plain text and escape it. Never
    // pass free-form input through as raw HTML (stored-XSS vector).
    htmlContent = escapeHtml(typeof content === 'string' ? content : '');
  }

  return sanitizeHtml(htmlContent);
}
