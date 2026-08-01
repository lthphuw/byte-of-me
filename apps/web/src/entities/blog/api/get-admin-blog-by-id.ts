'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminBlog } from '@/entities/blog';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The editor dialog's source of truth. `getPaginatedAdminBlogs` deliberately
 * drops `translations[].content` from its list rows (see `AdminBlogListItem`),
 * so the dialog fetches the full post here instead of reusing the list item
 * as `initialData` — reusing it is exactly how an empty `content` field would
 * silently overwrite a published post on save.
 */
export async function getAdminBlogById(id: string): Promise<ApiResponse<AdminBlog>> {
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
        translations: true,
        project: {
          include: {
            translations: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                translations: true,
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
