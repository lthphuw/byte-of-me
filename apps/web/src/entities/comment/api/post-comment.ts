'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';
import { getLocale } from 'next-intl/server';

import type { PublicComment } from '@/entities';
import { mailer } from '@/shared/api/mailer';
import { env } from '@/shared/config/env';
import { requireUser } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function postComment(
  blogId: string,
  content: string
): Promise<ApiResponse<PublicComment>> {
  if (!blogId) {
    throw new Error('Blog id is required');
  }

  if (!content || content.trim().length < 2) {
    throw new Error('Comment is too short');
  }

  const locale = await getLocale();
  const user = await requireUser();

  try {
    const comment = await prisma.comment.create({
      data: {
        blogId,
        userId: user.id,
        content: content.trim(),
      },
    });

    const blog = await prisma.blog.findUniqueOrThrow({
      where: { id: blogId },
      include: { translations: true },
    });

    const translated = getTranslatedContent(blog.translations, locale);

    await mailer.sendMail({
      from: `"Byte of Me" <${env.EMAIL_SERVER_USER}>`,
      to: env.EMAIL,
      subject: `New comment on: ${translated?.title ?? 'Your blog'}`,
      replyTo: user.email ?? undefined,

      text: `
New comment on "${translated?.title}"

From: ${user.email}

Content:
${content}
      `.trim(),

      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>New Comment Notification</h2>

          <p><strong>Blog:</strong> ${translated?.title ?? 'Unknown'}</p>
          <p><strong>From:</strong> ${user.email ?? 'anonymous'}</p>

          <hr />

          <p><strong>Comment:</strong></p>
          <p style="white-space: pre-wrap;">${content}</p>

          ${
            blog?.slug
              ? `<p style="margin-top:16px;">
                   <a href="${process.env.NEXT_PUBLIC_APP_URL}/blog/${blog.slug}">
                     View Blog
                   </a>
                 </p>`
              : ''
          }
        </div>
      `,
    });

    revalidateTag(CACHE_TAGS.COMMENT, 'profile');

    return {
      success: true,
      data: {
        ...comment,
        user: {
          email: user.email || 'anonymous',
        },
      },
    };
  } catch (error: Any) {
    logger.error(`Got error when post a comment ${error.message}`);
    throw new Error('Failed to post comment');
  }
}
