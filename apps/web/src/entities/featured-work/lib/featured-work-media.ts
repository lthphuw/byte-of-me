import type { Prisma } from '@byte-of-me/db/types';

import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import { ACCEPTED_VIDEO_MIME_TYPES } from '@/entities/media/model/upload-constraints';

/** The join rows for a validated `media` array: a slot is its position in the array. */
export function toMediaRows(
  media: NonNullable<FeaturedWorkFormValues['media']>
) {
  return media.map((item, sortOrder) => ({
    mediaId: item.mediaId,
    sortOrder,
    label: item.label ?? null,
  }));
}

/**
 * True when every id is one of this admin's own images or accepted videos.
 * The ids come from the caller, so ownership is checked here against `Media.userId`
 * and not assumed from the library UI; anything else (another user's file, a PDF)
 * would render as a broken demo or leak a file across owners.
 */
export async function ownsAllMedia(
  db: Pick<Prisma.TransactionClient, 'media'>,
  userId: string,
  mediaIds: string[]
): Promise<boolean> {
  if (mediaIds.length === 0) return true;
  const owned = await db.media.count({
    where: {
      id: { in: mediaIds },
      userId,
      OR: [
        { mimeType: { startsWith: 'image/' } },
        { mimeType: { in: [...ACCEPTED_VIDEO_MIME_TYPES] } },
      ],
    },
  });
  // Ids are unique (the schema rejects duplicates), so a short count means a stranger.
  return owned === mediaIds.length;
}
