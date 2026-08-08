import { prisma } from '@byte-of-me/db';

import 'server-only';

import { getAuthenticatedUser, normalizeEmail } from '@/shared/lib/auth';

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

/** What the raw CTE returns — snake_case, straight off the table. */
interface AccessRow {
  root_id: string;
  owner_id: string;
  depth: number;
  role: string;
}

/**
 * Whether the signed-in caller may reach `noteId`, and on what terms.
 *
 * This is the security boundary for the entire sharing feature. Every read on
 * the shared surface, and its one write, calls it on the note THEY are about.
 * That is what removes the whole class of "forgot to check the subtree" bug:
 * there is no subtree check to forget, because the upward walk has already
 * answered it — and it is why no action may ever accept a `rootId` from the
 * client.
 *
 * Deliberately NOT wrapped in React `cache()`. Every caller is a server
 * action, and a server action is its own request that resolves access exactly
 * once, so the memoisation would buy nothing while pulling a React
 * request-context dependency into a module `bun test` has to import outside
 * any render.
 */
export async function resolveNoteAccess(
  noteId: string
): Promise<NoteAccess | null> {
  const user = await getAuthenticatedUser();
  const email = normalizeEmail(user?.email);

  // Both guards return before the query rather than letting an empty string
  // reach the `WHERE`. An empty email matches nothing today, but that is a
  // property of the data, not a rule this function would be stating.
  if (!email || !noteId) {
    return null;
  }

  // `depth` counts up from the note itself, so a grant at a GREATER depth sits
  // further up the tree — a wider share. It stays inside the CTE: it is int4,
  // which the driver hands over as a number rather than the BigInt
  // `getDescendantCount` has to coerce.
  const rows = await prisma.$queryRaw<AccessRow[]>`
    WITH RECURSIVE chain AS (
      SELECT n.id, n.parent_id, n.owner_id, n.archived_at, 0 AS depth
      FROM notes n
      WHERE n.id = ${noteId}
      UNION ALL
      SELECT p.id, p.parent_id, p.owner_id, p.archived_at, c.depth + 1
      FROM chain c
      JOIN notes p ON p.id = c.parent_id AND p.owner_id = c.owner_id
    )
    SELECT c.id AS root_id, c.owner_id, c.depth, s.role
    FROM chain c
    JOIN note_shares s ON s.note_id = c.id AND s.email = ${email}
    WHERE NOT EXISTS (
      SELECT 1 FROM chain a
      WHERE a.archived_at IS NOT NULL AND a.depth <= c.depth
    )
  `;

  // Three things in that SQL are load-bearing and must not be simplified.
  //
  // `AND p.owner_id = c.owner_id` makes the walk STOP at the first row a
  // different owner holds instead of climbing past it — `getNoteAncestors`
  // documents why filtering afterwards is strictly weaker.
  //
  // The `NOT EXISTS` clause drops a grant when the note, or any ancestor
  // BELOW the granting node, is in the trash. `a.depth <= c.depth` is what
  // scopes it to the path under the grant: archiving something above the
  // shared root is irrelevant to whether the share still holds.
  //
  // And every grant on the path comes back, not `LIMIT 1`, because the two
  // reductions below need all of them.

  if (rows.length === 0) {
    return null;
  }

  // Two independent reductions over the same rows. `rootId` is the widest
  // visible scope; `role` is the strongest grant anywhere on the path, so a
  // stray VIEWER grant on a child cannot silently downgrade the EDITOR grant
  // given on the folder above it.
  //
  // The role comparison is an exact match, which makes the narrowing
  // fail-closed: a value written by a future migration this code has not seen
  // reads as VIEWER rather than as something permissive.
  let widest = rows[0];
  let role: NoteShareRole = 'VIEWER';

  for (const row of rows) {
    if (row.depth > widest.depth) {
      widest = row;
    }
    if (row.role === 'EDITOR') {
      role = 'EDITOR';
    }
  }

  return { ownerId: widest.owner_id, role, rootId: widest.root_id };
}
