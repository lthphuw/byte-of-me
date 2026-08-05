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
> & {
  labelIds: string[];
  /**
   * How many notes sit directly under this one.
   *
   * The tree loads one level at a time, so a collapsed folder's children have
   * never been fetched — without this the expand chevron would either be
   * missing on real folders or offered on empty ones until the author clicked
   * to find out. A count is one `_count` on a query that was happening anyway.
   */
  childCount: number;
};

/**
 * One page of a cursor-paginated list.
 *
 * `nextCursor` is the id of the last row returned, or `null` when the list is
 * exhausted — the caller passes it straight back as `cursor`. An id rather
 * than an offset because rows shift under a reader who is creating and moving
 * notes, and an offset silently skips or repeats when they do.
 */
export interface NotePage<T> {
  rows: T[];
  nextCursor: string | null;
}

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

/**
 * One node in the knowledge graph. Deliberately no `content`/`plainText`:
 * this draws circles and, past a zoom threshold, titles — the same
 * narrow-select discipline `getNoteTree` and `getSpaceStats` follow.
 * `degree` is computed server-side because the client would otherwise walk
 * every edge once per node to find it.
 */
export interface NoteGraphNode {
  id: string;
  title: string;
  status: string;
  labelIds: string[];
  /** Links touching this node in EITHER direction. Zero means orphan. */
  degree: number;
}

/** One directed link. Both ends are guaranteed to exist in `NoteGraph.nodes`. */
export interface NoteGraphEdge {
  source: string;
  target: string;
}

/** The whole owner-scoped graph, in one payload. */
export interface NoteGraph {
  nodes: NoteGraphNode[];
  edges: NoteGraphEdge[];
}

/**
 * The grouped explorer's "everything else" bucket.
 *
 * Deliberately a second declaration of the string the explorer feature already
 * exports: an entity may never import a feature (FSD, AGENTS §3), and this key
 * is now produced server-side by `getNoteGroupSummaries` and parsed back by
 * `getNotesInGroup`, so it is entity vocabulary. The feature copy disappears
 * when the client-side `groupRows` is retired.
 */
export const NO_LABEL_GROUP_KEY = 'no-label';

/**
 * One section of the grouped explorer, counted without loading its rows.
 *
 * `count` is the TRUE bucket size from an aggregate, never the number of rows
 * currently loaded — the sections paginate independently, so a header counting
 * what it had on screen would both understate the bucket and change as the
 * reader scrolled.
 */
export interface NoteGroupSummary {
  /** `status:<value>`, `label:<labelId>`, or `NO_LABEL_GROUP_KEY`. */
  key: string;
  /**
   * A status token or a label name. For the unlabeled bucket this is the key
   * token, not prose: this layer is i18n-free and the caller localizes it.
   */
  title: string;
  /** Set only when the bucket IS a label — drops need the id, not the name. */
  labelId?: string;
  count: number;
}

/** A search result: enough to render a row, never the whole document. */
export type NoteSearchHit = Pick<Note, 'id' | 'title' | 'updatedAt'> & {
  /** A short window of `plainText` around nothing in particular — just the head. */
  snippet: string;
};
