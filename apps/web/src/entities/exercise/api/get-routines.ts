'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { ROUTINE_SELECT, toRoutineRow } from './exercise-fields';

import { routineListSchema } from '@/entities/exercise/model/exercise-schema';
import type { RoutineRow } from '@/entities/exercise/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Every routine the owner has, each with its items already in performing
 * order.
 *
 * `idx_routines_owner_position` is `(owner_id, is_archived, position)` — this
 * predicate and this ordering exactly. The items are fetched in the same
 * round trip through a nested `select`, never `include`: a routine needs
 * three display fields off each catalog entry, and `include` would pull the
 * whole entry per item.
 *
 * Returns an empty array rather than throwing when nothing is stored — this
 * is awaited by a server component, where a throw escapes the RSC and
 * replaces the page with the root `error.tsx`.
 */
export async function getRoutines(
  input: unknown = {}
): Promise<ApiResponse<RoutineRow[]>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(routineListSchema, input, 'getRoutines');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const rows = await prisma.routine.findMany({
      where: {
        ownerId: session.id,
        ...(parsed.data.includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: ROUTINE_SELECT,
    });

    return { success: true, data: rows.map(toRoutineRow) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load routines');
    logger.error(`Get routines error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
