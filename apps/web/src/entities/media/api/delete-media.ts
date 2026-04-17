'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { supabaseStorage } from '@/shared/api/s3-storage-api';
import { auth } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { Media } from '@/shared/types/models';





export async function deleteMedia(id: string): Promise<ApiResponse<Media>> {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    const media = await prisma.media.findUniqueOrThrow({
      where: {
        id: id,
      },
    });

    await supabaseStorage.deleteFile(media.fileKey);

    const res = await prisma.media.delete({
      where: {
        id,
      },
    });
    revalidateTag(CACHE_TAGS.MEDIA, 'max');

    return { success: true, data: res };
  } catch (e) {
    logger.error(`Delete media got error: ${(e as Any).message}`);
    return { success: false, errorMsg: 'Can not delete media.' };
  }
}
