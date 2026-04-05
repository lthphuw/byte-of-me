'use server';

import { connection } from 'next/server';
import { SocialLink } from '@/models/social-link';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { ApiActionResponse } from '@/types/api/api-action.type';





export async function getSocialLinks(
  userId: string
): Promise<ApiActionResponse<SocialLink[]>> {

  try {
    const socialLinks = await prisma.socialLink.findMany({
      where: { userId: userId },
    });

    return {
      success: true,
      data: socialLinks,
    };
  } catch (error: any) {
    logger.error(`[Service Error] getUserProfile: ${error.message}`);

    return {
      success: false,
      errorMsg: error.message || 'An unexpected error occurred',
    };
  }
}
