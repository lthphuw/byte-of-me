'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { SESSION_LIST_SELECT, toSessionRow } from './workout-fields';

import type { WorkoutSessionRow } from '@/entities/workout/model/types';
import { workoutRangeSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * One window of training history, newest day first.
 *
 * Bounded at BOTH ends and validated, so a caller cannot turn this into an
 * unbounded scan of the table. `idx_workout_sessions_owner_date` is
 * `(owner_id, local_date DESC)` — this predicate and this ordering exactly.
 *
 * Descending, where `getSleepLogs` is ascending, and the difference is what
 * the two feed: a sleep window is drawn as a chart that runs left to right in
 * time, a training window is read as a list of what you last did.
 *
 * The `DATE` bounds are built as UTC midnight because that is what
 * `toLocalDate` writes and what Prisma hands back for a `@db.Date` — the same
 * construction `getSleepLogs` uses, so the two domains stay comparable on the
 * column they will eventually be joined on.
 */
export async function getWorkoutSessions(
  input: unknown
): Promise<ApiResponse<WorkoutSessionRow[]>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(workoutRangeSchema, input, 'getWorkoutSessions');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const rows = await prisma.workoutSession.findMany({
      where: {
        ownerId: session.id,
        localDate: {
          gte: new Date(`${parsed.data.from}T00:00:00.000Z`),
          lte: new Date(`${parsed.data.to}T00:00:00.000Z`),
        },
      },
      orderBy: [{ localDate: 'desc' }, { startedAt: 'desc' }],
      select: SESSION_LIST_SELECT,
    });

    return { success: true, data: rows.map(toSessionRow) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load workouts');
    logger.error(`Get workout sessions error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
