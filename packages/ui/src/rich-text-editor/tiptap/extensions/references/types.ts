/**
 * A single bibliography entry. Stored inside the Tiptap document (on the
 * `referenceList` node) rather than in a database column, so every content
 * translation carries its own bibliography.
 */
export type ReferenceItem = {
  /** Stable identifier linking `citation` markers to this entry. */
  id: string;
  title: string;
  authors?: string;
  source?: string;
  year?: string;
  url?: string;
};

export const CITATION_NAME = 'citation';
export const REFERENCE_LIST_NAME = 'referenceList';

/**
 * Fallback heading for the rendered bibliography. It lives in the node's
 * attributes (not in the next-intl catalogue) because it is per-translation
 * content the author owns and can rewrite.
 */
export const DEFAULT_REFERENCES_TITLE = 'References';

/** Field names an author can fill in, in the order they are displayed. */
export const REFERENCE_FIELDS = [
  'title',
  'authors',
  'source',
  'year',
  'url',
] as const;

export type ReferenceField = (typeof REFERENCE_FIELDS)[number];

/** Creates an id for a new reference. Falls back when `crypto` is unavailable. */
export function createReferenceId(): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

  return `r${uuid.replace(/-/g, '').slice(0, 10)}`;
}
