'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { SESSION_DETAIL_SELECT, toSessionDetail } from './workout-fields';

import type { WorkoutSessionDetail } from '@/entities/workout/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The question the gym surface opens with: is a session still running?
 *
 * `endedAt: null` is the whole definition of "in progress" — the schema
 * carries no status column, and `idx_workout_sessions_owner_open`
 * (`owner_id`, `ended_at`) serves exactly this predicate.
 *
 * "No open session" is `{ success: true, data: null }`, not a failure. This is
 * awaited by a server component, where a throw escapes the RSC and replaces
 * the whole page with the root `error.tsx` instead of the in-place empty state
 * the screen already renders (`entities/note/api/get-space-stats.ts` documents
 * that trap at length). Nothing needs an input, so there is nothing to
 * validate — the guard is the whole boundary here.
 */
export async function getOpenWorkoutSession(): Promise<
  ApiResponse<WorkoutSessionDetail | null>
> {
  try {
    const session = await requireAdmin();

    const row = await prisma.workoutSession.findFirst({
      where: { ownerId: session.id, endedAt: null },
      // `startWorkoutSession` refuses to open a second one, so this normally
      // matches at most one row. The ordering makes the outcome deterministic
      // rather than arbitrary if a row ever slips past that guard.
      orderBy: { startedAt: 'desc' },
      select: SESSION_DETAIL_SELECT,
    });

    return { success: true, data: row ? toSessionDetail(row) : null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load the open workout');
    logger.error(`Get open workout session error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
