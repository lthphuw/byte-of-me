'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import { requireAdmin } from '@/shared/lib/auth';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ADMIN_OPTIONS_LIMIT } from '@/shared/lib/query/admin-list';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** What a project picker renders; `title` falls back to the slug. */
export type ProjectOption = { id: string; slug: string; title: string };

/**
 * The owner's projects for a select — id, slug and a locale-resolved title,
 * not the full admin rows (descriptions, tech stacks, tags, coauthors).
 * Capped at ADMIN_OPTIONS_LIMIT, newest first.
 */
export async function getAdminProjectOptions(): Promise<
  ApiResponse<ProjectOption[]>
> {
  try {
    const session = await requireAdmin();
    const locale = await getLocale();

    const projects = await prisma.project.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: ADMIN_OPTIONS_LIMIT,
      select: {
        id: true,
        slug: true,
        translations: { select: { language: true, title: true } },
      },
    });

    return {
      success: true,
      data: projects.map(({ id, slug, translations }) => ({
        id,
        slug,
        title: getTranslatedContent(translations, locale)?.title || slug,
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch project options');
    logger.error(`[Project] getAdminProjectOptions: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
