'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminBlog } from '@/entities/blog';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * The editor dialog's source of truth: list rows drop `translations[].content`
 * (`AdminBlogListItem`), and reusing one as `initialData` would let an empty `content` overwrite a
 * published post on save.
 */
export async function getAdminBlogById(
  id: string
): Promise<ApiResponse<AdminBlog>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const blog = await prisma.blog.findFirstOrThrow({
      where: { id, userId: session.id },
      include: {
        coverImage: true,
        // Every locale, every column — the editor's language tabs edit
        // `content`, so this one stays a full include.
        translations: true,
        // The nested translations are only ever read for their label, so they
        // are narrowed: a full include drags `ProjectTranslation.description`
        // (`@db.Text`) along for every locale.
        project: {
          include: {
            translations: {
              select: { id: true, language: true, title: true },
            },
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                translations: {
                  select: { id: true, language: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    return { success: true, data: blog };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch blog post');
    logger.error(`Get admin blog by id error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
