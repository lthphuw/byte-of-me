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

    const children = node.content ?? [];
    // An INLINE run — a paragraph's text nodes, the pieces a mark splits a
    // sentence into — must concatenate with nothing between them, or `Byte`
    // + ` of Me` becomes `Byte  of Me`. Anything else is a run of BLOCKS
    // (list items, the paragraphs inside one, table cells) and needs a gap.
    //
    // Joining every level with '' is what shipped, and it welded the last
    // word of each block onto the first word of the next: two list items
    // reading `…through the data.` and `Step Size: …` produced
    // `data.Step`, which Postgres's full-text parser then tokenised as a
    // single `host` token. Neither `data` nor `Step` was searchable
    // afterwards. Measured against the real corpus before this changed: 300
    // words present in the text were missing from `search_vector`.
    const inlineOnly = children.every((child) => child.type === 'text');
    return children.map(collect).join(inlineOnly ? '' : ' ');
  };

  return (
    (doc.content ?? [])
      .map(collect)
      .filter(Boolean)
      .join(' ')
      // Collapse the runs the separators above can double up (an empty
      // hard break between two text nodes, a block that collects to
      // nothing) rather than leaking them into an excerpt.
      .replace(/\s+/g, ' ')
      .trim()
  );
}
