'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import { requireAdmin } from '@/shared/lib/auth';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ADMIN_OPTIONS_LIMIT } from '@/shared/lib/query/admin-list';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** What a tag picker renders; `name` falls back to the slug. */
export type TagOption = { id: string; slug: string; name: string };

/**
 * Every tag for a select — id, slug and a locale-resolved name, without the
 * per-locale translation rows. Capped at ADMIN_OPTIONS_LIMIT, newest first.
 */
export async function getAdminTagOptions(): Promise<ApiResponse<TagOption[]>> {
  try {
    await requireAdmin();
    const locale = await getLocale();

    const tags = await prisma.tag.findMany({
      orderBy: { createdAt: 'desc' },
      take: ADMIN_OPTIONS_LIMIT,
      select: {
        id: true,
        slug: true,
        translations: { select: { language: true, name: true } },
      },
    });

    return {
      success: true,
      data: tags.map(({ id, slug, translations }) => ({
        id,
        slug,
        name: getTranslatedContent(translations, locale)?.name || slug,
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch tag options');
    logger.error(`[Tag] getAdminTagOptions: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
