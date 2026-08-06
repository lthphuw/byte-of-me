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

/** An unsaved new row, open in the tree but not yet in the database. */
export interface NoteDraft {
  /** The level it will be created in. `null` is the root level. */
  parentId: string | null;
  isFolder: boolean;
}

/**
 * Everything the tree's interaction state hands to a row.
 *
 * ONE prop rather than eight. Selection, expansion, the draft row and the
 * in-place rename all move together as the author works, and threading them
 * separately through a component that recurses at every depth is how
 * `NoteTreeItem`'s prop list grew in the first place.
 *
 * Declared HERE, in the entity, and IMPLEMENTED in
 * `features/dashboard/note-explorer` — the same direction `renderActions` and
 * `renderRowShell` already run in. An entity stating the contract it expects to
 * be handed keeps the layering (AGENTS §3) intact; an entity importing the
 * feature's hook to borrow its return type would invert it.
 *
 * `selectedId` is deliberately NOT the note open in the editor. That one comes
 * from the URL and is passed separately as `activeId`. VSCode keeps the same
 * two apart, and the difference is load-bearing: what a new note is created
 * next to is the SELECTION, which is why creating one no longer always lands at
 * the root.
 */
export interface NoteExplorerControls {
  selectedId: string | null;
  expandedIds: ReadonlySet<string>;
  /** Non-null while a draft row is open somewhere in the tree. */
  draft: NoteDraft | null;
  /** The row being renamed in place, if any. */
  renamingId: string | null;
  /**
   * Set for exactly as long as a reveal is outstanding.
   *
   * The row with this id scrolls itself into view when it MOUNTS and then
   * clears the flag. Deliberately not a timer: the row does not exist until its
   * level query resolves, so any delay would be a guess — and under CDP a
   * backgrounded tab clamps timers to 1 Hz, which turns that guess into a
   * second of nothing happening.
   */
  revealId: string | null;
  select: (id: string) => void;
  toggle: (id: string) => void;
  /** Commits the draft. An empty title cancels rather than creating. */
  submitDraft: (title: string) => void;
  cancelDraft: () => void;
  startRename: (id: string) => void;
  submitRename: (id: string, title: string) => void;
  cancelRename: () => void;
  clearReveal: () => void;
}

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

/**
 * One rung of a note's ancestor chain, as `getNoteAncestors` returns it: root
 * first, immediate parent last, the note itself never included.
 *
 * `isFolder` is carried because the two consumers do different things with a
 * rung — the explorer expands it to reveal a note opened from the palette or a
 * `[[` link, the editor header renders it as a breadcrumb crumb — and a
 * non-folder parent is legal in this tree (any note can hold children).
 */
export type NoteAncestor = Pick<Note, 'id' | 'title' | 'isFolder'>;
