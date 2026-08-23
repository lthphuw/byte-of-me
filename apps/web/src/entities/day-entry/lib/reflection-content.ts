/**
 * The `reflection` column is `@db.Text`, unchanged by this feature — it is
 * about to hold stringified Tiptap JSON instead of a line of plain text, the
 * same shape `Note.content` already uses. There is no migration and no
 * backfill: every row written before this change is plain text, and it stays
 * plain text in the database until the next time that day is saved.
 *
 * This module is the one place that knows both shapes. `parseReflection`
 * reads a stored value back into a document, accepting the JSON form only
 * when it unambiguously says `type: 'doc'` — anything else, including valid
 * JSON that just isn't a document (`[1,2,3]`, a bare number), is legacy text
 * someone typed into the old textarea, and is wrapped one paragraph per line
 * instead of being misread as a document. `serializeReflection` goes the
 * other way, and `reflectionPlainText` extracts the words alone, with the
 * envelope of node types and marks stripped out — used to measure the length
 * cap against what a person actually wrote.
 */
import type { JSONContent } from '@tiptap/core';

function textParagraph(line: string): JSONContent {
  return line === ''
    ? { type: 'paragraph' }
    : { type: 'paragraph', content: [{ type: 'text', text: line }] };
}

function wrapPlainText(text: string): JSONContent {
  return {
    type: 'doc',
    content: text.split('\n').map(textParagraph),
  };
}

function isTiptapDoc(value: unknown): value is JSONContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { type?: unknown }).type === 'doc'
  );
}

/**
 * Reads a stored `reflection` value back into a Tiptap document.
 *
 * `null` and whitespace-only strings mean "nothing written". Anything that
 * parses as JSON AND is a non-array object with `type: 'doc'` is read as a
 * stored document; everything else — malformed JSON, an array, a bare
 * primitive, or genuine prose — is legacy plain text, split on `\n` into one
 * paragraph per line.
 */
export function parseReflection(stored: string | null): JSONContent | null {
  if (stored === null || stored.trim() === '') return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (isTiptapDoc(parsed)) return parsed;
  } catch {
    // Not JSON at all — fall through to the plain-text path below.
  }

  return wrapPlainText(stored);
}

function nodeHasText(node: JSONContent): boolean {
  if (node.type === 'text' && typeof node.text === 'string' && node.text !== '')
    return true;
  return node.content?.some(nodeHasText) ?? false;
}

/**
 * Whether the document has any BLOCK content beyond an empty paragraph — an
 * image, a table, a code block, anything the editor mounted here can produce
 * that is not text. `nodeHasText` alone used to be the whole rule, which was
 * correct only while nothing could put a node in the document without also
 * putting text in it. `RichTextEditor` can: a pasted image, or a table of
 * empty cells, has no `text` node anywhere in it, and without this check
 * `serializeReflection` would collapse it to `null` and silently drop it on
 * save.
 */
function hasNonParagraphNode(doc: JSONContent): boolean {
  return (doc.content ?? []).some((node) => node.type !== 'paragraph');
}

/**
 * Serializes a Tiptap document for storage, or `null` when it is truly empty.
 *
 * An empty editor still produces `{ type: 'doc', content: [{ type:
 * 'paragraph' }] }` — storing that string would make the reflection look
 * "written" (e.g. draw the calendar's dot) for a day nobody actually wrote
 * anything on, so a document with no text AND no node other than a paragraph
 * collapses to `null`, just like a cleared field does. A document that has
 * neither text nor a non-paragraph node has nothing else worth keeping.
 */
export function serializeReflection(doc: JSONContent | null): string | null {
  if (doc === null) return null;
  if (!nodeHasText(doc) && !hasNonParagraphNode(doc)) return null;
  return JSON.stringify(doc);
}

function collectText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(collectText).join('');
}

/**
 * The prose alone, with the JSON envelope — node types, marks, brackets —
 * stripped out. Top-level blocks are joined with `\n`, mirroring how
 * `parseReflection` turns legacy lines into paragraphs. This is what the
 * length cap measures, not the serialized document.
 */
export function reflectionPlainText(doc: JSONContent | null): string {
  if (doc === null) return '';
  return (doc.content ?? []).map(collectText).join('\n');
}
