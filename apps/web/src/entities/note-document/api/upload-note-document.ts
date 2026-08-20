'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { noteDocumentFileKey } from '@/entities/note-document/lib/storage-key';
import {
  describeDocumentViolation,
  findDocumentViolation,
} from '@/entities/note-document/model/document-constraints';
import type { NoteDocumentSummary } from '@/entities/note-document/model/types';
import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Attaches ONE PDF to a note.
 *
 * One file per request, not a batch: `serverActions.bodySizeLimit` is 20mb and
 * the ceiling here is 5 MB per file, so a batch of five would be refused by
 * the framework before this function ran — and the framework's refusal cannot
 * name the offending file. The client uploads sequentially and reports per
 * file, the way `uploadImages` already does for images.
 *
 * Nothing here writes the `Media` table: attachments are not media-library
 * entries, they have no public URL, and `uploadMedia` would give them one.
 *
 * Deliberately NOT `revalidateTag`: no note action revalidates (see
 * `create-note.ts`), and nothing on the cached public surface can render a
 * private attachment.
 */
export async function uploadNoteDocument(
  noteId: string,
  formData: FormData
): Promise<ApiResponse<NoteDocumentSummary>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, noteId, 'uploadNoteDocument');
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  // `FormData.get` answers `File | string | null`, and a caller that posted a
  // plain field named `file` would otherwise reach `file.size` on a string.
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, errorMsg: 'No file provided.' };
  }

  // Before any network or database work: an oversized or wrong-typed file that
  // reaches storage is worse than a rejected one, because the object then sits
  // in the bucket with no row pointing at it and nothing to sweep it.
  const violation = findDocumentViolation(file);
  if (violation) {
    return { success: false, errorMsg: describeDocumentViolation(violation) };
  }

  try {
    // Ownership is checked BEFORE the bytes are written, and explicitly rather
    // than by relying on the create's foreign key: a foreign `noteId` would
    // otherwise have its object uploaded into this owner's prefix and only
    // then be refused. A note that is not this caller's is reported exactly as
    // a missing one — saying "forbidden" would confirm the note exists.
    const note = await prisma.note.findFirst({
      where: { id: parsedId.data, ownerId: session.id },
      select: { id: true },
    });

    if (!note) {
      return { success: false, errorMsg: 'Note not found' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileKey = noteDocumentFileKey(session.id, note.id);

    // `privateStorage`, never `supabaseStorage`: the latter's bucket answers
    // an anonymous GET with 200. Nothing may call `getPublicUrl` on this
    // instance — for a private bucket that URL resolves to nothing, and a
    // component rendering it would fail quietly instead of loudly.
    await privateStorage.uploadFile({
      fileKey,
      body: buffer,
      contentType: file.type,
    });

    try {
      const document = await prisma.noteDocument.create({
        data: {
          // The file name is a display label, not an identifier, and it is not
          // part of the storage key — renaming is free, and the key never has
          // to carry author-supplied text.
          title: file.name,
          fileKey,
          mimeType: file.type,
          size: file.size,
          noteId: note.id,
          ownerId: session.id,
        },
        select: {
          id: true,
          title: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      });

      return { success: true, data: document };
    } catch (error) {
      // The row is what makes an object reachable. If it never landed, the
      // object is unreachable forever — remove it best-effort rather than
      // leave a bucket entry nothing can name. The original failure is what
      // the caller is told about, so this cleanup swallows its own error.
      await privateStorage.deleteFile(fileKey).catch((cleanupError: unknown) => {
        logger.error(
          `Upload note document: orphaned object ${fileKey}: ${getErrorMessage(
            cleanupError,
            'unknown error'
          )}`
        );
      });

      throw error;
    }
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to upload attachment');
    logger.error(`Upload note document error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
