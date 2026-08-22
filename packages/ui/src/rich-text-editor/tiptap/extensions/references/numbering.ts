import type { JSONContent } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import {
  CITATION_NAME,
  DEFAULT_REFERENCES_TITLE,
  REFERENCE_LIST_NAME,
  type ReferenceItem,
} from './types';

export type CitationNumbering = {
  /** Reference id → its 1-based citation number. */
  numbers: Map<string, number>;
  /** Reference entries sorted so `index + 1` equals the entry's number. */
  ordered: ReferenceItem[];
  /** Heading the author chose for the bibliography. */
  title: string;
};

const EMPTY_NUMBERING: CitationNumbering = {
  numbers: new Map(),
  ordered: [],
  title: DEFAULT_REFERENCES_TITLE,
};

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/**
 * Node attributes come off the document as untyped JSON, so every entry is
 * validated before it is handed to the rest of the app. Entries without an id
 * are dropped — they can never be linked to a citation marker.
 */
export function normalizeReferenceItems(value: unknown): ReferenceItem[] {
  if (!Array.isArray(value)) return [];

  const items: ReferenceItem[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;

    const record = entry as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);

    items.push({
      id,
      title: typeof record.title === 'string' ? record.title : '',
      authors: optionalString(record.authors),
      source: optionalString(record.source),
      year: optionalString(record.year),
      url: optionalString(record.url),
    });
  }

  return items;
}

/**
 * IEEE numbering: entries are numbered by the order their first citation
 * marker appears in the text. Entries that are never cited keep their place in
 * the list and are numbered after every cited one, so an author who adds a
 * reference before citing it still sees a stable number.
 */
function buildNumbering(
  citedIds: string[],
  items: ReferenceItem[],
  title: string
): CitationNumbering {
  const numbers = new Map<string, number>();
  const known = new Set(items.map((item) => item.id));
  let next = 0;

  for (const id of citedIds) {
    if (numbers.has(id) || !known.has(id)) continue;
    numbers.set(id, ++next);
  }

  for (const item of items) {
    if (!numbers.has(item.id)) numbers.set(item.id, ++next);
  }

  const ordered = [...items].sort(
    (a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0)
  );

  return { numbers, ordered, title };
}

/** Reads citations and the bibliography out of a Tiptap JSON document. */
export function readReferencesFromJSON(doc: JSONContent): CitationNumbering {
  const citedIds: string[] = [];
  let items: ReferenceItem[] = [];
  let title = DEFAULT_REFERENCES_TITLE;

  const walk = (node: JSONContent): void => {
    if (node.type === CITATION_NAME) {
      const refId = node.attrs?.refId;
      if (typeof refId === 'string' && refId) citedIds.push(refId);
    } else if (node.type === REFERENCE_LIST_NAME) {
      items = normalizeReferenceItems(node.attrs?.items);
      title = optionalString(node.attrs?.title) ?? DEFAULT_REFERENCES_TITLE;
    }

    node.content?.forEach(walk);
  };

  walk(doc);

  return buildNumbering(citedIds, items, title);
}

/**
 * Memoised on the document node itself.
 *
 * Every citation marker in the document subscribes to this through
 * `useEditorState` (see `citation-view.tsx`), and so does the bibliography
 * preview — and `useEditorState` fires on `transaction`, not just `update`. So
 * one keystroke in a document with N citations ran N + 1 full `descendants`
 * walks over the whole document, and so did every arrow key, click and
 * drag-select, which change no text at all.
 *
 * A ProseMirror document node is immutable and is shared by every subscriber
 * within a transaction, which makes it the exact cache key this wants: N + 1
 * walks collapse to one, and a selection-only transaction — same node — walks
 * nothing. A `WeakMap` because the entry must die with the revision it belongs
 * to; a document with an edit history is thousands of nodes, and nothing here
 * knows when one stops being reachable.
 */
const numberingCache = new WeakMap<ProseMirrorNode, CitationNumbering>();

/** Same as {@link readReferencesFromJSON}, for a live ProseMirror document. */
export function readReferencesFromDoc(
  doc: ProseMirrorNode | null | undefined
): CitationNumbering {
  if (!doc) return EMPTY_NUMBERING;

  const cached = numberingCache.get(doc);
  if (cached) return cached;

  const citedIds: string[] = [];
  let items: ReferenceItem[] = [];
  let title = DEFAULT_REFERENCES_TITLE;

  doc.descendants((node) => {
    if (node.type.name === CITATION_NAME) {
      const refId = node.attrs.refId;
      if (typeof refId === 'string' && refId) citedIds.push(refId);
    } else if (node.type.name === REFERENCE_LIST_NAME) {
      items = normalizeReferenceItems(node.attrs.items);
      title = optionalString(node.attrs.title) ?? DEFAULT_REFERENCES_TITLE;
    }
    return true;
  });

  const numbering = buildNumbering(citedIds, items, title);
  numberingCache.set(doc, numbering);
  return numbering;
}

/**
 * Bakes the computed numbers into a copy of the document so `generateHTML` can
 * render markers and the bibliography without needing whole-document context.
 * The original document is never mutated — numbers are derived, not stored.
 */
export function applyCitationNumbering(doc: JSONContent): JSONContent {
  const { numbers, ordered, title } = readReferencesFromJSON(doc);
  const seen = new Set<string>();

  const transform = (node: JSONContent): JSONContent => {
    if (node.type === CITATION_NAME) {
      const refId = typeof node.attrs?.refId === 'string' ? node.attrs.refId : '';
      const order = numbers.get(refId) ?? null;
      const first = Boolean(refId) && order !== null && !seen.has(refId);
      if (first) seen.add(refId);

      return { ...node, attrs: { ...node.attrs, refId, order, first } };
    }

    if (node.type === REFERENCE_LIST_NAME) {
      return { ...node, attrs: { ...node.attrs, title, items: ordered } };
    }

    if (!node.content) return node;

    return { ...node, content: node.content.map(transform) };
  };

  return transform(doc);
}
