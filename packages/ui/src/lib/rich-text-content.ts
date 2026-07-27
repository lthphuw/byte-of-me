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

/**
 * Text-only reading of a stored rich text value, for excerpt contexts
 * (`line-clamp` cards) where markup would be clipped mid-tag anyway. Blocks
 * are joined with spaces; legacy plain text passes through unchanged.
 */
export function richTextToPlainText(value?: string | null): string {
  if (!value) return '';

  const doc = parseRichTextContent(value);
  if (!doc) return value;

  const collect = (node: JSONContent): string => {
    if (node.type === 'text') return node.text ?? '';
    return (node.content ?? []).map(collect).join('');
  };

  return (doc.content ?? [])
    .map(collect)
    .filter(Boolean)
    .join(' ')
    .trim();
}
