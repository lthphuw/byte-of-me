import { unstable_cache } from 'next/cache';
import { ApiResponse } from '@/shared/types/api/api-response.type';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import { env } from '@/env.mjs';

export type PublicActionContext = {
  locale: string;
  userId: string;
  email: string;
};

export type PublicActionOptions = {
  cache?: boolean;
  cacheKey?: string[];
  cacheTags?: string[];
};

export async function withPublicActionHandler<TData>(
  actionName: string,
  handler: (context: PublicActionContext) => Promise<TData>,
  options: PublicActionOptions = {}
): Promise<TData> {
  const locale = await getLocale();

  const email = env.EMAIL;
  const userId = env.AUTHOR_ID;
  const context: PublicActionContext = { locale, email, userId };

  if (!prisma) {
    throw new Error("Can not find prisma...");
  }

  if (options.cache) {
    const cachedHandler = unstable_cache(
      () => {
        logger.debug(
          `[Public][${email}] Executing public action handler for ${actionName} with locale ${locale}`
        );
        return handler(context);
      },
      options.cacheKey || [actionName],
      { tags: options.cacheTags || [actionName] }
    );
    return await cachedHandler();
  } else {
    return await handler(context);
  }
}

export async function handlePublicAction<TData>(
  actionName: string,
  handler: () => Promise<TData>
): Promise<ApiResponse<TData>> {
  try {
    const data = await handler();
    return { success: true, data };
  } catch (error: any) {
    logger.error(`[Public] ${actionName}: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'An unexpected error occurred',
    };
  }
}
