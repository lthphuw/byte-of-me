
/** The minimum a note row must expose for the tree walks below. */
export type NoteParentRef = { id: string; parentId: string | null };

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
