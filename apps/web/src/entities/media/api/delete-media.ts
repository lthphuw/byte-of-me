'use server';

import { auth } from '@/features/auth/lib/auth';
import { supabaseStorage } from '@/shared/api/s3-storage-api';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { Media } from '@/shared/types/models';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

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
    return { success: true, data: res };
  } catch (e) {
    logger.error(`Delete media got error: ${(e as any).message}`);
    return { success: false, errorMsg: 'Can not delete media.' };
  }
}
