import type { NoteTreeNode } from './types';

/** The minimum a note row must expose for the tree walks below. */
export type NoteParentRef = { id: string; parentId: string | null };

export type NoteTreeNodeWithChildren = NoteTreeNode & {
  children: NoteTreeNodeWithChildren[];
};

/**
 * True when re-parenting `noteId` under `nextParentId` would make the note its
 * own ancestor.
 *
 * A recursive CTE would push this into raw SQL and out of the type-safe Prisma
 * client. At personal scale the whole owner's `(id, parentId)` set fits in one
 * query, so the walk happens here instead — and is directly unit-testable.
 *
 * The `seen` set is not paranoia: if a bug ever writes a cycle into the table,
 * an unguarded walk would spin forever inside a request.
 */
export function wouldCreateCycle(
  rows: NoteParentRef[],
  noteId: string,
  nextParentId: string | null
): boolean {
  if (nextParentId === null) return false;
  if (nextParentId === noteId) return true;

  const parentOf = new Map(rows.map((row) => [row.id, row.parentId]));
  const seen = new Set<string>();

  let cursor: string | null | undefined = nextParentId;
  while (cursor) {
    if (cursor === noteId) return true;
    if (seen.has(cursor)) return false;
    seen.add(cursor);
    cursor = parentOf.get(cursor) ?? null;
  }

  return false;
}

/** Every transitive child of `noteId`, excluding `noteId` itself. */
export function collectDescendantIds(
  rows: NoteParentRef[],
  noteId: string
): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const siblings = childrenOf.get(row.parentId) ?? [];
    siblings.push(row.id);
    childrenOf.set(row.parentId, siblings);
  }

  const result: string[] = [];
  const seen = new Set<string>([noteId]);
  const queue = [...(childrenOf.get(noteId) ?? [])];

  while (queue.length) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }

  return result;
}

/**
 * Flat rows (already ordered by `position`) into a nested tree. Rows whose
 * parent is missing from the set are surfaced at the root rather than dropped —
 * a hidden note is worse than a misplaced one. The same rule covers a parent
 * link that is present but cyclic (see below): it is treated as absent rather
 * than wired in, so the note still shows up, just not where it claims to be.
 */
export function buildNoteTree(
  rows: NoteTreeNode[]
): NoteTreeNodeWithChildren[] {
  const byId = new Map<string, NoteTreeNodeWithChildren>(
    rows.map((row) => [row.id, { ...row, children: [] }])
  );
  const roots: NoteTreeNodeWithChildren[] = [];

  for (const row of rows) {
    const node = byId.get(row.id);
    if (!node) continue;

    const parent = row.parentId ? byId.get(row.parentId) : undefined;

    // wouldCreateCycle(rows, row.id, row.parentId) is true exactly when the
    // *stored* parentId chain loops back to row.id — i.e. this row is
    // already part of a cycle, not just about to become one. That should
    // never happen (wouldCreateCycle gates every re-parent before it is
    // written), but if corrupt data ever slips through, attaching this node
    // under its own descendant would splice it into a circular object graph:
    // not a wrong tree, but one that recurses forever the first time React
    // renders it or anything serializes it. Surfacing the note at the root
    // instead keeps the result finite and acyclic, consistent with how a
    // missing parent is handled above.
    const parentIsCyclic =
      parent !== undefined && wouldCreateCycle(rows, row.id, row.parentId);

    if (parent && !parentIsCyclic) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
