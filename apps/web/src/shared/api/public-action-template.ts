import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { unstable_cache } from 'next/cache';
import { getLocale } from 'next-intl/server';

import 'server-only';

import { env } from '@/shared/config/env';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





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
      { tags: options.cacheTags || [actionName] }
    );
    return await cachedHandler();
  } else {
    return await handler(context);
  }
}

/**
 * Every failure this template can report — one code, because a caught throw
 * is all it can distinguish. A Prisma outage, a malformed row and a bug in the
 * handler arrive here identically; which one it was belongs in the log, not in
 * a vocabulary the client would have to translate. `'unknown'` is deliberately
 * the same id the contact form already renders (`contact.form.errors.unknown`).
 */
export type PublicActionFailureCode = 'unknown';

/**
 * What a visitor is told when a public read fails.
 *
 * This template has ~20 consumers across the public site, and it used to
 * return `getErrorMessage(error)` verbatim — so a Postgres error naming a
 * table, a column or a host could be forwarded to whatever rendered the
 * failure. The message a visitor reads is now fixed; the caught message still
 * reaches the log below, unchanged.
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
