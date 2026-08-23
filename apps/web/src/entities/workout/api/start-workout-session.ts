'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { SESSION_DETAIL_SELECT, toSessionDetail } from './workout-fields';

import type { WorkoutSessionDetail } from '@/entities/workout/model/types';
import { workoutStartSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { toLocalDate } from '@/shared/lib/health/local-date';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Open a session, seeded from a routine or empty.
 *
 * `localDate` is derived HERE, from `startedAt` in the caller's zone, and is
 * never accepted from the client: it is the column phase 3 joins sleep and
 * training on, and letting the caller name the day would put it under their
 * control. A workout belongs to the day it STARTED — the opposite end from a
 * sleep, which belongs to the day it ended.
 *
 * `title` is a SNAPSHOT of the routine name rather than a live join, because
 * `WorkoutSession.routineId` is `onDelete: SetNull`: deleting "Push Day" must
 * not blank the heading of every session that ran it.
 *
 * A second session cannot be opened while one is running. `WorkoutSession` has
 * no status column — `endedAt IS NULL` is the whole definition of "in
 * progress", and `idx_workout_sessions_owner_open` exists on the assumption
 * that it matches zero or one row. Two open sessions would make
 * `getOpenWorkoutSession` pick one arbitrarily and silently log sets into it.
 */
export async function startWorkoutSession(
  input: unknown
): Promise<ApiResponse<WorkoutSessionDetail>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(workoutStartSchema, input, 'startWorkoutSession');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { routineId, title, startedAt, timeZone } = parsed.data;

    const alreadyOpen = await prisma.workoutSession.count({
      where: { ownerId: session.id, endedAt: null },
    });
    if (alreadyOpen > 0) {
      return { success: false, errorMsg: 'A workout is already in progress' };
    }

    // The routine read is owner-scoped, so a caller cannot seed their session
    // from somebody else's plan — which would copy that plan's exercise ids
    // into their own session and expose the names through `getWorkoutSession`.
    const routine = routineId
      ? await prisma.routine.findFirst({
          where: { id: routineId, ownerId: session.id },
          select: {
            id: true,
            name: true,
            items: {
              orderBy: { position: 'asc' },
              select: { exerciseId: true },
            },
          },
        })
      : null;

    if (routineId && !routine) {
      return { success: false, errorMsg: 'Routine not found' };
    }

    // `title` is guaranteed non-null by the schema whenever there is no
    // routine, so the fallback chain cannot end in an empty heading.
    const sessionTitle = routine ? routine.name : title ?? '';

    const started = new Date(startedAt);

    const created = await prisma.workoutSession.create({
      data: {
        ownerId: session.id,
        routineId: routine?.id ?? null,
        title: sessionTitle,
        startedAt: started,
        localDate: toLocalDate(started, timeZone),
        exercises: routine
          ? {
              create: routine.items.map((item, index) => ({
                exerciseId: item.exerciseId,
                position: index,
              })),
            }
          : undefined,
      },
      select: SESSION_DETAIL_SELECT,
    });

    return { success: true, data: toSessionDetail(created) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to start workout');
    logger.error(`Start workout session error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
