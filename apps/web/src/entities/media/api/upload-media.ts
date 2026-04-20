'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { supabaseStorage } from '@/shared/api/s3-storage-api';
import { env } from '@/shared/config/env';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { generateFriendlyId } from '@/shared/lib/uuid';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { Media } from '@/shared/types/models';

export async function uploadMedia(
  files: File[]
): Promise<ApiResponse<Media[]>> {
  const user = await requireAdmin();

  if (!files || files.length === 0) {
    return { success: false, errorMsg: 'No files provided.' };
  }

  try {
    const uploadPromises = files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExtension = file.name.split('.').pop();
      const now = new Date();
      const fileKey = `users/${user.id}/media/${now.getFullYear()}/${
        now.getMonth() + 1
      }/${now.getDate()}/${generateFriendlyId()}.${fileExtension}`;

      await supabaseStorage.uploadFile({
        fileKey,
        body: buffer,
        contentType: file.type,
      });

      const url = await supabaseStorage.getPublicUrl(fileKey);

      return prisma.media.create({
        data: {
          url,
          bucket: env.SUPABASE_S3_STORAGE_BUCKET,
          fileKey: fileKey,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          provider: 'SUPABASE',
          userId: user.id,
        },
      });
    });

    const results = await Promise.all(uploadPromises);

    revalidateTag(CACHE_TAGS.MEDIA, 'max');
    return { success: true, data: results };
  } catch (error) {
    logger.error(`Upload error: ${(error as Any).message}`);
    return { success: false, errorMsg: 'Failed to upload one or more images.' };
  }
}
