'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * How many notes sit beneath `noteId`, transitively.
 *
 * The delete confirmation needs this to say what a permanent delete will take
 * with it. `collectDescendantIds` used to answer it client-side, which was
 * only possible because the sidebar held the entire corpus in memory — the
 * read the pagination work removes. Once the tree loads one level at a time, a
 * collapsed folder's subtree simply is not in the browser, so the question has
 * to be asked of the database.
 *
 * A recursive CTE rather than a loop of `findMany` calls: the depth is
 * unbounded and each level would otherwise be a round trip.
 */
export async function getDescendantCount(
  noteId: string
): Promise<ApiResponse<number>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, noteId);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    // Owner scoping is inside the walk, on every level, not applied to the
    // result: seeded only from rows this owner holds and recursing only
    // through them, a foreign subtree can never be reached — and so its size
    // can never be inferred from the number this returns.
    const rows = await prisma.$queryRaw<{ count: number | bigint }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id
        FROM notes
        WHERE parent_id = ${parsedId.data} AND owner_id = ${session.id}
        UNION ALL
        SELECT n.id
        FROM notes n
        JOIN descendants d ON n.parent_id = d.id
        WHERE n.owner_id = ${session.id}
      )
      SELECT count(*) AS count FROM descendants
    `;

    // `count(*)` is int8, which the driver hands over as a BigInt. Returning
    // one from a server action reaches React as an unserializable value.
    const raw = rows[0]?.count ?? 0;

    return { success: true, data: Number(raw) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to count notes');
    logger.error(`Get descendant count error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
