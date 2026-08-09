/**
 * Find-or-create a chain of folder notes.
 *
 * NOT a server action — no `'use server'`, no `requireAdmin()`. It runs inside
 * the R&D publish transaction, which authenticated by bearer token in the route
 * handler and passes `ownerId` explicitly. Everything else in this directory
 * follows the §8 server-action shape; this is the documented exception rather
 * than a drift.
 */
import type { Prisma } from '@byte-of-me/db';

export interface NoteFolderSegment {
  title: string;
}

/**
 * The id of the deepest folder in `segments`, creating any that are missing.
 *
 * An existing folder is matched by title within its parent and is **never**
 * retitled: `R&D/` very likely predates this tool and belongs to the user, and
 * a publish that renames a folder it merely passes through is a publish that
 * edits notes it was not given.
 *
 * Sequential rather than parallel on purpose — each level needs the level above
 * it to exist before it can be parented.
 */
export async function ensureNoteFolderPath(
  tx: Prisma.TransactionClient,
  ownerId: string,
  segments: NoteFolderSegment[],
  startParentId: string | null = null
): Promise<string | null> {
  let parentId: string | null = startParentId;

  for (const segment of segments) {
    const existing = await tx.note.findFirst({
      where: { ownerId, parentId, title: segment.title, isFolder: true },
      select: { id: true },
    });

    if (existing) {
      parentId = existing.id;
      continue;
    }

    const last = await tx.note.findFirst({
      where: { ownerId, parentId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const created = await tx.note.create({
      data: {
        ownerId,
        title: segment.title,
        // A folder note carries no document of its own; this is the same empty
        // shape `createNote` writes.
        content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
        plainText: '',
        isFolder: true,
        parentId,
        position: (last?.position ?? -1) + 1,
      },
      select: { id: true },
    });

    parentId = created.id;
  }

  return parentId;
}
