/**
 * The one place that knows both shapes `reflection` can hold: stringified
 * Tiptap JSON, and the plain text every row written before it still holds —
 * there was no migration and no backfill.
 *
 * NOT `packages/ui/src/lib/rich-text-content.ts`, and do not merge into it:
 * its parser takes any JSON object as a document (`[1,2,3]` included), and
 * its plain-text pass collapses whitespace the length cap has to count.
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

/** A stored value back into a document. Only an unambiguous `type: 'doc'`
 *  reads as JSON; everything else, prose or `[1,2,3]`, is legacy plain text
 *  split on `\n` into one paragraph per line. */
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

/** Any BLOCK content beyond an empty paragraph. `nodeHasText` alone dropped
 *  a pasted image or a table of empty cells on save — neither holds a `text`
 *  node anywhere. */
function hasNonParagraphNode(doc: JSONContent): boolean {
  return (doc.content ?? []).some((node) => node.type !== 'paragraph');
}

/** For storage, or `null` when truly empty. An untouched editor still emits
 *  one empty paragraph, and storing that would draw the calendar's
 *  written-up dot on a day nobody wrote. */
export function serializeReflection(doc: JSONContent | null): string | null {
  if (doc === null) return null;
  if (!nodeHasText(doc) && !hasNonParagraphNode(doc)) return null;
  return JSON.stringify(doc);
}

function collectText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(collectText).join('');
}

/** The prose alone, envelope stripped, blocks joined with `\n` as
 *  `parseReflection` splits them. What the length cap measures. */
export function reflectionPlainText(doc: JSONContent | null): string {
  if (doc === null) return '';
  return (doc.content ?? []).map(collectText).join('\n');
}
