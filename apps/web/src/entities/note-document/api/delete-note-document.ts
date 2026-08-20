'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Removes one attachment: the row first, then the object.
 *
 * That order is the whole point. Object-first leaves a row pointing at nothing
 * — the panel still lists the file, and clicking it opens a viewer that can
 * never load — while row-first leaves at worst an unreachable object, which is
 * a storage bill rather than a broken screen. A failed object delete is
 * therefore logged, not propagated: the author's delete really did succeed.
 *
 * Returns the id it deleted, so the caller can drop that row without guessing
 * which mutation resolved.
 */
export async function deleteNoteDocument(
  documentId: string
): Promise<ApiResponse<string>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, documentId, 'deleteNoteDocument');
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    // Owner-scoped read: a document belonging to somebody else matches nothing
    // and is reported exactly as a missing one. Not a 403-shaped failure —
    // distinguishing the two would confirm the row exists.
    const document = await prisma.noteDocument.findFirst({
      where: { id: parsedId.data, ownerId: session.id },
      select: { id: true, fileKey: true },
    });

    if (!document) {
      return { success: false, errorMsg: 'Attachment not found' };
    }

    // `ownerId` stays on the write even though the read above was already
    // owner-scoped. It is the security boundary, not a filter that has become
    // redundant — the same argument `deleteNote` records.
    const { count } = await prisma.noteDocument.deleteMany({
      where: { id: document.id, ownerId: session.id },
    });

    // Nothing was removed — a concurrent delete got there first. Leaving the
    // object alone is the safe reading: if that other caller is mid-flight,
    // removing its object here would strand it.
    if (count === 0) {
      return { success: false, errorMsg: 'Attachment not found' };
    }

    try {
      await privateStorage.deleteFile(document.fileKey);
    } catch (error) {
      logger.error(
        `Delete note document: orphaned object ${document.fileKey}: ${getErrorMessage(
          error,
          'unknown error'
        )}`
      );
    }

    return { success: true, data: document.id };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete attachment');
    logger.error(`Delete note document error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
