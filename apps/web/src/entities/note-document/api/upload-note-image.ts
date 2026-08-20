'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { noteDocumentFileKey } from '@/entities/note-document/lib/storage-key';
import {
  describeDocumentViolation,
  findInlineImageViolation,
  inlineImageExtension,
  noteDocumentHref,
} from '@/entities/note-document/model/document-constraints';
import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Stores an image pasted or dropped into a note's BODY, and answers with the
 * URL the document should reference.
 *
 * This exists because the note editor used to hand its images to
 * `uploadMedia`, which writes them to the PUBLIC bucket and returns a public
 * URL. Measured before this was written: a `GET` of one of those objects with
 * no credentials at all answers 200. Twenty-two images from private notes were
 * sitting there — research screenshots, a whiteboard photo — each reachable by
 * anyone holding its URL.
 *
 * So an inline image is a `NoteDocument` like an attachment is, with
 * `kind: 'INLINE'` to keep it out of the Files panel: every pasted screenshot
 * appearing in a list of "attachments" would make that list useless.
 *
 * The returned href is an app route, not a bucket address. That is the whole
 * point — the object has no address that works without a session.
 */
export async function uploadNoteImage(
  noteId: string,
  formData: FormData
): Promise<ApiResponse<string>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, noteId, 'uploadNoteImage');
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, errorMsg: 'No file provided.' };
  }

  const violation = findInlineImageViolation(file);
  if (violation) {
    return { success: false, errorMsg: describeDocumentViolation(violation) };
  }

  try {
    // Ownership before bytes, for the reason `uploadNoteDocument` gives: a
    // foreign `noteId` would otherwise have its object written into this
    // owner's prefix and only then be refused.
    const note = await prisma.note.findFirst({
      where: { id: parsedId.data, ownerId: session.id },
      select: { id: true },
    });

    if (!note) {
      return { success: false, errorMsg: 'Note not found' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileKey = noteDocumentFileKey(
      session.id,
      note.id,
      inlineImageExtension(file.type)
    );

    await privateStorage.uploadFile({
      fileKey,
      body: buffer,
      contentType: file.type,
    });

    try {
      const document = await prisma.noteDocument.create({
        data: {
          // The editor's auto-upload path builds its File as
          // `new File([blob], 'image')`, so this is often just "image". It is
          // a label for the Files panel — which does not list inline images
          // anyway — and never part of the key.
          title: file.name || 'image',
          fileKey,
          mimeType: file.type,
          size: file.size,
          noteId: note.id,
          ownerId: session.id,
          kind: 'INLINE',
        },
        select: { id: true },
      });

      return { success: true, data: noteDocumentHref(document.id) };
    } catch (error) {
      // The row never landed, so nothing references these bytes and nothing
      // ever will. Best-effort, because failing here would report an upload
      // failure the author cannot act on.
      await privateStorage.deleteFile(fileKey).catch(() => {});
      throw error;
    }
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to upload the image');
    logger.error(`uploadNoteImage: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
