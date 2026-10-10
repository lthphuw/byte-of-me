'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const directionSchema = z.enum(['up', 'down']);

export async function reorderFeaturedWork(
  id: string,
  direction: 'up' | 'down'
): Promise<ApiResponse<null>> {
  try {
    const user = await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    // A server action is a public endpoint: the TypeScript union is not enforced at runtime.
    const parsedDirection = parseInput(directionSchema, direction);
    if (!parsedDirection.ok) {
      return { success: false, errorMsg: parsedDirection.errorMsg };
    }

    const result = await prisma.$transaction(
      async (tx): Promise<ApiResponse<{ changed: boolean }>> => {
        const items = await tx.featuredWork.findMany({
          where: { userId: user.id },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true, sortOrder: true },
        });

        const index = items.findIndex((item) => item.id === id);
        if (index === -1) {
          return { success: false, errorMsg: 'Featured work not found' };
        }

        const neighbourIndex = direction === 'up' ? index - 1 : index + 1;

        // Equal values (possible after a manual DB edit) would make a swap a
        // no-op, so renumber the whole list to 0..n-1 in its current order first.
        const hasTie = items.some(
          (item, i) => i > 0 && item.sortOrder === items[i - 1]?.sortOrder
        );
        const rows = hasTie
          ? items.map((item, i) => ({ id: item.id, sortOrder: i }))
          : items;

        const current = rows[index];
        const neighbour = rows[neighbourIndex];
        if (!current || !neighbour) {
          return { success: true, data: { changed: false } };
        }

        const swapped = rows.map((row) => {
          if (row.id === current.id) return { ...row, sortOrder: neighbour.sortOrder };
          if (row.id === neighbour.id) return { ...row, sortOrder: current.sortOrder };
          return row;
        });

        await Promise.all(
          swapped
            .filter((row, i) => row.sortOrder !== items[i]?.sortOrder)
            .map((row) =>
              tx.featuredWork.update({
                where: { id: row.id },
                data: { sortOrder: row.sortOrder },
              })
            )
        );

        return { success: true, data: { changed: true } };
      }
    );

    if (!result.success) {
      return { success: false, errorMsg: result.errorMsg };
    }

    // Revalidate only after the transaction has committed; an edge move wrote nothing.
    if (result.data.changed) {
      revalidateTag(CACHE_TAGS.FEATURED_WORK, 'max');
    }

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to reorder featured work');
    logger.error(`Reorder featured work error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
