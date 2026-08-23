'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { SESSION_LIST_SELECT, toSessionRow } from './workout-fields';

import type { WorkoutSessionRow } from '@/entities/workout/model/types';
import { workoutFinishSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Close a session: set `endedAt`, and record the session RPE.
 *
 * `endedAt` is the entire definition of "finished" — there is no status column
 * — so this action is what makes `getOpenWorkoutSession` stop returning the
 * row and what lets a new session be started.
 *
 * `startedAt` is read first because the end must not precede the start:
 * duration is `endedAt - startedAt`, and a negative one would feed a negative
 * training load into every downstream figure rather than failing anywhere
 * visible. The check needs the stored value, which is why this is the one
 * write here that reads before it writes; the write still carries the owner
 * predicate itself, so the read is a validation step and not the guard.
 *
 * `localDate` is deliberately NOT recomputed. A session belongs to the day it
 * STARTED, so a workout that runs past local midnight keeps the day it was
 * logged under — re-deriving from `endedAt` would move it, and the column is
 * what phase 3 joins on.
 */
export async function finishWorkoutSession(
  input: unknown
): Promise<ApiResponse<WorkoutSessionRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      workoutFinishSchema,
      input,
      'finishWorkoutSession'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { id, endedAt, sessionRpe, notes } = parsed.data;
    const owned = { id, ownerId: session.id };

    const stored = await prisma.workoutSession.findFirst({
      where: owned,
      select: { startedAt: true },
    });

    if (!stored) {
      return { success: false, errorMsg: 'Workout not found' };
    }

    const ended = new Date(endedAt);
    if (ended < stored.startedAt) {
      return {
        success: false,
        errorMsg: 'A workout cannot end before it starts',
      };
    }

    const { count } = await prisma.workoutSession.updateMany({
      where: owned,
      data: { endedAt: ended, sessionRpe, notes },
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Workout not found' };
    }

    const row = await prisma.workoutSession.findFirst({
      where: owned,
      select: SESSION_LIST_SELECT,
    });

    if (!row) {
      return { success: false, errorMsg: 'Workout not found' };
    }

    return { success: true, data: toSessionRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to finish the workout');
    logger.error(`Finish workout session error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
