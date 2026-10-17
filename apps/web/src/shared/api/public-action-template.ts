import type { ApiResponse } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { unstable_cache } from 'next/cache';
import { getLocale } from 'next-intl/server';

import 'server-only';

import { env } from '@/shared/config/env';
import { getErrorMessage } from '@/shared/lib/utils';

type PublicActionContext = {
  locale: string;
  userId: string;
  email: string;
};

type PublicActionOptions = {
  cache?: boolean;
  cacheKey?: string[];
  cacheTags?: string[];
  /**
   * Seconds before the entry is refreshed in the background. Omit for data the
   * app itself writes (a tag revalidates it); set it for data that changes
   * outside the app, such as a third-party API.
   */
  revalidate?: number;
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
    throw new Error('Can not find prisma...');
  }

  if (options.cache) {
    const cacheKey = [...(options.cacheKey || [actionName]), locale];
    const cachedHandler = unstable_cache(
      () => {
        logger.debug(
          `[Public][${email}] Executing public action handler for ${actionName} with locale ${locale}`
        );
        return handler(context);
      },
      cacheKey,
      {
        tags: options.cacheTags || [actionName],
        revalidate: options.revalidate,
      }
    );
    return await cachedHandler();
  } else {
    return await handler(context);
  }
}

/**
 * One failure code: a caught throw is all this template can distinguish (outage, bad row, bug); the
 * cause goes in the log. `'unknown'` matches `contact.form.errors.unknown`.
 */
type PublicActionFailureCode = 'unknown';

/**
 * Fixed message for a failed public read: forwarding `getErrorMessage(error)` could leak a table,
 * column or host name from a Postgres error. The caught message still reaches the log.
 */
export const PUBLIC_ACTION_FAILURE_MESSAGE =
  'Something went wrong. Please try again.';

export async function handlePublicAction<TData>(
  actionName: string,
  handler: () => Promise<TData>
): Promise<ApiResponse<TData, PublicActionFailureCode>> {
  try {
    const data = await handler();
    return { success: true, data };
  } catch (error) {
    logger.error(`[Public] ${actionName}: ${getErrorMessage(error)}`);
    return {
      success: false,
      errorCode: 'unknown',
      errorMsg: PUBLIC_ACTION_FAILURE_MESSAGE,
    };
  }
}
