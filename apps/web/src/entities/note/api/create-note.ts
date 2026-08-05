'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  type CreateNoteInput,
  createNoteSchema,
} from '@/entities/note/model/note-schema';
import type { NoteDetail } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** An empty Tiptap document — what the editor mounts with. */
const EMPTY_DOC = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

/**
 * No `revalidateTag` here, and none in any other note action: notes have no
 * public surface and the dashboard is never cached, so there is nothing for a
 * cache tag to invalidate. Freshness comes from TanStack Query invalidation.
 * Adding a `CACHE_TAGS.NOTE` would revalidate nothing.
 */
export async function createNote(
  input: CreateNoteInput
): Promise<ApiResponse<NoteDetail>> {
  const session = await requireAdmin();

  const parsed = parseInput(createNoteSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const data = parsed.data;

  try {
    const parentId = data.parentId ?? null;

    // Append to the end of the sibling list. A gap left by a deleted sibling is
    // harmless: `position` only has to order, not to be contiguous.
    const lastSibling = await prisma.note.findFirst({
      where: { ownerId: session.id, parentId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const note = await prisma.note.create({
      data: {
        ownerId: session.id,
        title: data.title,
        content: EMPTY_DOC,
        plainText: '',
        parentId,
        position: (lastSibling?.position ?? -1) + 1,
        isFolder: data.isFolder ?? false,
      },
      select: {
        id: true,
        title: true,
        content: true,
        parentId: true,
        position: true,
        isPinned: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        properties: true,
        isFolder: true,
        labels: {
          select: { label: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    return {
      success: true,
      data: { ...note, labels: note.labels.map((row) => row.label) },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to create note');
    logger.error(`Create note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
