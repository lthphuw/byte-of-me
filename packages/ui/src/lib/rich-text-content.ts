import type { Content, JSONContent } from '@tiptap/core';

/**
 * Bridges the gap between a Tiptap editor and a plain `String` DB column.
 *
 * Rich text is persisted as a stringified Tiptap document, but columns that
 * predate the editor still hold plain text. Both directions have to keep
 * working, so parsing is best-effort and never throws.
 */

/** Parse a stored value into a Tiptap document, or `null` if it isn't one. */
export function parseRichTextContent(content: unknown): JSONContent | null {
  if (!content) return null;

  if (typeof content === 'object') return content as JSONContent;

  if (typeof content !== 'string') return null;

  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as JSONContent)
      : null;
  } catch {
    return null;
  }
}

/**
 * Value to seed a `RichTextEditor` with. Legacy plain text is handed to Tiptap
 * as-is, which turns it into a paragraph rather than losing it.
 */
export function toEditorContent(value?: string | null): Content {
  if (!value) return '';
  return parseRichTextContent(value) ?? value;
}

/** Serialize an editor document for storage in a `String` column. */
export function fromEditorContent(json: JSONContent): string {
  return JSON.stringify(json);
}
