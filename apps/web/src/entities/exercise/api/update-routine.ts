'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { areExercisesOwnedBy } from './assert-owned-exercises';
import { ROUTINE_SELECT, toRoutineRow } from './exercise-fields';

import { routineUpdateSchema } from '@/entities/exercise/model/exercise-schema';
import type { RoutineRow } from '@/entities/exercise/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Rename a routine and REPLACE its item list.
 *
 * All of it inside one interactive transaction, and the ownership check is
 * the first statement in it: the `updateMany` on `(id, ownerId)` both applies
 * the rename and proves the routine is the caller's, so `count === 0` aborts
 * before a single item is deleted. Checking ownership in a separate query
 * ahead of the transaction would leave the delete outside the proof.
 *
 * Replace rather than diff: the editor has no stable ids for rows it just
 * added, and a partial update cannot express "this exercise was removed". No
 * history is lost by deleting items — what actually happened in the gym lives
 * in `WorkoutExercise`, which is a separate table for exactly this reason.
 */
export async function updateRoutine(
  input: unknown
): Promise<ApiResponse<RoutineRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(routineUpdateSchema, input, 'updateRoutine');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { id, name, notes, items } = parsed.data;

    const owned = await areExercisesOwnedBy(
      items.map((item) => item.exerciseId),
      session.id
    );
    if (!owned) {
      return { success: false, errorMsg: 'Unknown exercise in routine' };
    }

    const row = await prisma.$transaction(async (tx) => {
      const { count } = await tx.routine.updateMany({
        where: { id, ownerId: session.id },
        data: { name, notes },
      });

      if (count === 0) return null;

      await tx.routineExercise.deleteMany({ where: { routineId: id } });

      if (items.length > 0) {
        await tx.routineExercise.createMany({
          data: items.map((item, index) => ({
            ...item,
            routineId: id,
            position: index,
          })),
        });
      }

      return tx.routine.findFirst({
        where: { id, ownerId: session.id },
        select: ROUTINE_SELECT,
      });
    });

    if (!row) {
      return { success: false, errorMsg: 'Routine not found' };
    }

    return { success: true, data: toRoutineRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update routine');
    logger.error(`Update routine error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
