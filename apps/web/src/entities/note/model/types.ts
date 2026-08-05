import type { Note, NoteLabel } from '@byte-of-me/db';

/** What any label consumer renders — never the join rows. */
export type NoteLabelSummary = Pick<NoteLabel, 'id' | 'name' | 'color'>;

/**
 * A row in the sidebar tree. Deliberately excludes `content` and `plainText`:
 * the tree renders every note the author owns, and shipping the documents to
 * draw a list of titles is the mistake AGENTS §8 records about blogs.
 * `status`/`labelIds` are here because the explorer's grouped views bucket by
 * them — ids only; names resolve through the one `getNoteLabels` list.
 */
export type NoteTreeNode = Pick<
  Note,
  | 'id'
  | 'title'
  | 'parentId'
  | 'position'
  | 'isPinned'
  | 'archivedAt'
  | 'updatedAt'
  | 'createdAt'
  | 'status'
  | 'isFolder'
> & { labelIds: string[] };

/** Scalar the properties panel can hold. Arrays/objects are deliberately out. */
export type NotePropertyValue = string | number | boolean;

/** The note's "frontmatter": a flat key→scalar map (see the design spec). */
export type NoteProperties = Record<string, NotePropertyValue>;

/** The full document, fetched on demand when a note opens. */
export type NoteDetail = Pick<
  Note,
  | 'id'
  | 'title'
  | 'content'
  | 'parentId'
  | 'position'
  | 'isPinned'
  | 'archivedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
  | 'properties'
  | 'isFolder'
> & { labels: NoteLabelSummary[] };

/**
 * `properties` arrives as Prisma `JsonValue`; narrow it once, here, so no
 * component re-implements the guard. Non-conforming values (from a future
 * migration or manual SQL) degrade to being dropped, never to a crash.
 */
export function parseNoteProperties(value: unknown): NoteProperties {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const out: NoteProperties = {};
  for (const [key, v] of Object.entries(value)) {
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      out[key] = v;
    }
  }
  return out;
}

/** One end of a note-to-note link, as the links panel renders it. */
export type NoteLinkRef = Pick<Note, 'id' | 'title' | 'archivedAt'>;

/** One note's immediate neighbourhood in the link graph. */
export interface NoteLinkGraph {
  /** Notes this note links to. */
  outgoing: NoteLinkRef[];
  /** Notes that link to this note — backlinks. */
  incoming: NoteLinkRef[];
}

/** A hub "recently edited" row: enough for a link, never the document. */
export type SpaceRecentNote = Pick<
  Note,
  'id' | 'title' | 'status' | 'updatedAt'
>;

/** What the `/space` hub renders — one owner-scoped aggregate read. */
export interface SpaceStats {
  /** Non-archived notes. */
  noteCount: number;
  archivedCount: number;
  linkCount: number;
  /** Five newest non-archived notes, newest first. */
  recentNotes: SpaceRecentNote[];
}

/** A search result: enough to render a row, never the whole document. */
export type NoteSearchHit = Pick<Note, 'id' | 'title' | 'updatedAt'> & {
  /** A short window of `plainText` around nothing in particular — just the head. */
  snippet: string;
};
