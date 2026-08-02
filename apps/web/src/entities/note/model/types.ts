import type { Note } from '@byte-of-me/db';

/**
 * A row in the sidebar tree. Deliberately excludes `content` and `plainText`:
 * the tree renders every note the author owns, and shipping the documents to
 * draw a list of titles is the mistake AGENTS §8 records about blogs.
 */
export type NoteTreeNode = Pick<
  Note,
  'id' | 'title' | 'parentId' | 'position' | 'isPinned' | 'archivedAt' | 'updatedAt'
>;

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
>;

/** A search result: enough to render a row, never the whole document. */
export type NoteSearchHit = Pick<Note, 'id' | 'title' | 'updatedAt'> & {
  /** A short window of `plainText` around nothing in particular — just the head. */
  snippet: string;
};
