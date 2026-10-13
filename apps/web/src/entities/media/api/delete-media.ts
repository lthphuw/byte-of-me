'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { supabaseStorage } from '@/shared/api';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { Media } from '@/shared/types/models';

export async function deleteMedia(id: string): Promise<ApiResponse<Media>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const media = await prisma.media.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!media) {
      return { success: false, errorMsg: 'Media not found' };
    }

    // The row goes first: if it fails, the file stays and nothing points at a gap.
    const res = await prisma.media.delete({
      where: {
        id,
      },
    });
    revalidateTag(CACHE_TAGS.MEDIA, 'max');

    try {
      await supabaseStorage.deleteFile(media.fileKey);
    } catch (error) {
      // The row is gone, so a failed storage delete only leaves an orphan object.
      logger.warn(
        `Delete media: storage object of ${media.id} not removed: ${getErrorMessage(error)}`
      );
    }

    // Media is embedded in the cached payloads of these entities (covers, logos,
    // demos), so a deleted file must refresh them or the site serves a dead URL.
    const embeddingTags = [
      CACHE_TAGS.BLOG,
      CACHE_TAGS.COMPANY,
      CACHE_TAGS.EDUCATION,
      CACHE_TAGS.FEATURED_WORK,
      CACHE_TAGS.PROJECT,
      CACHE_TAGS.TECH,
      CACHE_TAGS.USER,
    ];
    for (const tag of embeddingTags) {
      revalidateTag(tag, 'max');
    }

    return { success: true, data: res };
  } catch (e) {
    logger.error(`Delete media got error: ${getErrorMessage(e)}`);
    return { success: false, errorMsg: 'Can not delete media.' };
  }
}
