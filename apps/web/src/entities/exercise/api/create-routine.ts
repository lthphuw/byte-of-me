'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { areExercisesOwnedBy } from './assert-owned-exercises';
import { ROUTINE_SELECT, toRoutineRow } from './exercise-fields';

import { routineCreateSchema } from '@/entities/exercise/model/exercise-schema';
import type { RoutineRow } from '@/entities/exercise/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Create a routine together with its items, in one statement.
 *
 * `position` on each item comes from the ARRAY INDEX, never from the client:
 * `RoutineExercise` has no unique constraint on `(routineId, position)`, so a
 * client-supplied position that collides produces a list whose order is
 * whatever Postgres feels like. The array the caller sent is already the
 * order they mean.
 *
 * The routine's own `position` is the current routine count, which appends it
 * to the end. Positions only have to order, not be contiguous.
 */
export async function createRoutine(
  input: unknown
): Promise<ApiResponse<RoutineRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(routineCreateSchema, input, 'createRoutine');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { name, notes, items } = parsed.data;

    const owned = await areExercisesOwnedBy(
      items.map((item) => item.exerciseId),
      session.id
    );
    if (!owned) {
      return { success: false, errorMsg: 'Unknown exercise in routine' };
    }

    const position = await prisma.routine.count({
      where: { ownerId: session.id },
    });

    const row = await prisma.routine.create({
      data: {
        name,
        notes,
        position,
        ownerId: session.id,
        items: {
          create: items.map((item, index) => ({ ...item, position: index })),
        },
      },
      select: ROUTINE_SELECT,
    });

    return { success: true, data: toRoutineRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to create routine');
    logger.error(`Create routine error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
