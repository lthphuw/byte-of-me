'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { SESSION_DETAIL_SELECT, toSessionDetail } from './workout-fields';

import type { WorkoutSessionDetail } from '@/entities/workout/model/types';
import { workoutSessionIdSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * One session with its exercises and their sets, in performing order.
 *
 * `findFirst` on `(id, ownerId)` rather than `findUnique` on the id: the owner
 * predicate has to be part of the query, not a check on the result, so a
 * session belonging to someone else is simply not found. That also means "no
 * such session" and "not yours" are indistinguishable in the response, which
 * is deliberate and matches how every read in these two slices reports a miss.
 *
 * A missing session is `{ success: true, data: null }`, not a failure — this
 * is awaited by a server component, where a throw would replace the page with
 * the root `error.tsx` rather than render the screen's own empty state.
 */
export async function getWorkoutSession(
  input: unknown
): Promise<ApiResponse<WorkoutSessionDetail | null>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      workoutSessionIdSchema,
      input,
      'getWorkoutSession'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const row = await prisma.workoutSession.findFirst({
      where: { id: parsed.data.id, ownerId: session.id },
      select: SESSION_DETAIL_SELECT,
    });

    return { success: true, data: row ? toSessionDetail(row) : null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load the workout');
    logger.error(`Get workout session error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
