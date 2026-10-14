import type { Content, JSONContent } from '@tiptap/core';

/**
 * Bridges a Tiptap editor and a plain `String` DB column: rich text is stored as a stringified
 * Tiptap document, but older columns hold plain text, so parsing is best-effort and never throws.
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
    // INLINE runs (a paragraph's text nodes, split by marks) join with '' (`Byte` + ` of Me`).
    // Runs of BLOCKS (list items, table cells) join with ' ', or `data.` + `Step` welds into
    // `data.Step`, which a full-text tokeniser reads as one host token.
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

/**
 * Block nodes that hold content only through their children. An empty one
 * shows nothing, so it is blank. Every other node type (image, code block,
 * rule, table, math) is a deliberate element and counts as content on its own.
 */
const CONTAINER_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
]);

/**
 * True when a stored value shows nothing: no text and no deliberate element (image, code block,
 * rule, table), only empty containers. Legacy plain text with content is not blank. Never throws.
 */
export function isRichTextBlank(value?: string | null): boolean {
  if (!value?.trim()) return true;
  const doc = parseRichTextContent(value);
  if (!doc) return false;
  return !hasSubstance(doc);
}

function hasSubstance(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const { type, text, content } = node as JSONContent;
  if (type === 'text') return typeof text === 'string' && text.trim() !== '';
  // A line break carries no words: a paragraph of nothing but one is empty.
  if (type === 'hardBreak') return false;
  if (typeof type === 'string' && !CONTAINER_NODE_TYPES.has(type)) return true;
  return Array.isArray(content) && content.some(hasSubstance);
}

/** Every image source in a stored document, once each, in reading order. */
export function collectImageSources(doc: JSONContent | null): string[] {
  const sources = new Set<string>();
  const visit = (node: JSONContent) => {
    if (node.type === 'image' && typeof node.attrs?.src === 'string') {
      sources.add(node.attrs.src);
    }
    for (const child of node.content ?? []) visit(child);
  };
  if (doc) visit(doc);
  return [...sources];
}
