'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { auth } from '@/lib/auth/auth';
import { supabaseStorage } from '@/lib/storage';
import { Media } from '@/models/media';

export async function deleteMedia(id: string): Promise<ApiActionResponse<Media>> {
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
