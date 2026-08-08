import type { Note } from '@byte-of-me/db';

// `import type` — erased at compile time, so reaching into the note slice for
// two shapes drags nothing into any bundle.
import type { NoteAncestor, NoteTreeNode } from '@/entities/note';

/** "VIEWER" is the safe reading of anything that is not exactly "EDITOR". */
export type NoteShareRole = 'VIEWER' | 'EDITOR';

export interface NoteAccess {
  /**
   * The note's owner. Every downstream query scopes to THIS, never to the
   * caller — a share recipient owns nothing on this surface.
   */
  ownerId: string;
  role: NoteShareRole;
  /** The highest granting node — the root of the subtree this caller may see. */
  rootId: string;
}

/** One row of the owner's share dialog. */
export interface NoteShareRow {
  id: string;
  email: string;
  role: NoteShareRole;
  /** True once the recipient has actually visited the shared surface. */
  accepted: boolean;
}

/**
 * What the delete and move confirmations need in order to be honest about who
 * is affected.
 *
 * `emails` is capped by the action so a folder shared with a long list cannot
 * turn a confirmation dialog into a wall of text; `shareCount` still reports
 * the true total, because understating who loses access on a destructive path
 * is the wrong direction to be wrong in.
 */
export interface NoteShareExposure {
  shareCount: number;
  emails: string[];
}

/** One entry in the recipient's inbox. */
export interface SharedInboxItem {
  noteId: string;
  title: string;
  isFolder: boolean;
  role: NoteShareRole;
  /** The owner's display name, or null if they never set one. */
  ownerName: string | null;
}

/**
 * A shared document.
 *
 * Narrower than `NoteDetail` on purpose. `labels` is absent because
 * `NoteLabel` is unique per owner and spans the whole vault — a name like
 * `job-hunting-2026` is information from outside the shared subtree.
 * `isPinned` is absent because it is the owner's own ordering preference and
 * means nothing to a recipient. `properties` and `status` stay: they are
 * authored on the note itself.
 */
export type SharedNoteDetail = Pick<
  Note,
  | 'id'
  | 'title'
  | 'content'
  | 'parentId'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
  | 'properties'
  | 'isFolder'
> & {
  role: NoteShareRole;
  rootId: string;
  /**
   * The note ids linked from this document that the caller may actually
   * reach. Every other link mark in `content` renders as plain text — the
   * content itself keeps the mark, so an editor save round-trips losslessly.
   */
  linkableIds: string[];
};

/**
 * The shared tree reuses `NoteRow`, so a shared child is shaped as a
 * `NoteTreeNode`.
 *
 * `labelIds` is always `[]` and `isPinned` always `false`: both are constants
 * this surface does not expose, not owner data narrowed down. Archived
 * children are filtered out of the query entirely, so `archivedAt` is always
 * null.
 */
export type SharedNoteChild = NoteTreeNode;

/** The breadcrumb, stopping at the share root. Same shape as the owner's. */
export type SharedNoteAncestor = NoteAncestor;
