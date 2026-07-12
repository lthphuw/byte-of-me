'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { supabaseStorage } from '@/shared/api';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { Media } from '@/shared/types/models';

export async function deleteMedia(id: string): Promise<ApiResponse<Media>> {
  try {
    const user = await requireAdmin();

    const media = await prisma.media.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!media) {
      return { success: false, errorMsg: 'Media not found' };
    }

    await supabaseStorage.deleteFile(media.fileKey);

    const res = await prisma.media.delete({
      where: {
        id,
      },
    });
    revalidateTag(CACHE_TAGS.MEDIA, 'max');

    // Media is embedded inside the cached payloads of these entities
    // (covers, logos, achievement images), so deleting a file must also
    // invalidate them or the public site keeps serving the dead URL.
    const embeddingTags = [
      CACHE_TAGS.BLOG,
      CACHE_TAGS.COMPANY,
      CACHE_TAGS.EDUCATION,
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
