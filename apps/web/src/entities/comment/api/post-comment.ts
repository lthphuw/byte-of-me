'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { escapeHtml } from '@byte-of-me/ui';
import { revalidateTag } from 'next/cache';
import { getLocale } from 'next-intl/server';

import type { PublicComment } from '@/entities/comment/model';
import { mailer } from '@/shared/api';
import { env } from '@/shared/config/env';
import { requireUser } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function postComment(
  blogId: string,
  content: string,
  parentId?: string
): Promise<ApiResponse<PublicComment>> {
  if (!blogId) throw new Error('Blog id is required');
  if (!content || content.trim().length < 2)
    throw new Error('Comment is too short');

  const locale = await getLocale();
  const user = await requireUser();

  try {
    const comment = await createCommentInDb(blogId, content, user.id, parentId);

    // No need to await this
    sendCommentNotification(
      blogId,
      content,
      user.email || 'anonymous',
      locale
    ).then((r) => {});

    revalidateTag(CACHE_TAGS.COMMENT, 'profile');

    return {
      success: true,
      data: {
        ...comment,
        parentId,
        user: {
          id: user.id,
          name: user.name || 'Anonymous',
        },
      },
    };
  } catch (error) {
    logger.error(`Failed to post comment: ${getErrorMessage(error)}`);
    throw new Error('Failed to post comment');
  }
}

async function createCommentInDb(
  blogId: string,
  content: string,
  userId: string,
  parentId?: string
) {
  return prisma.comment.create({
    data: { blogId, userId, parentId: parentId ?? null, content: content.trim() },
  });
}

async function sendCommentNotification(
  blogId: string,
  content: string,
  userEmail: string,
  locale: string
) {
  try {
    const blog = await prisma.blog.findUniqueOrThrow({
      where: { id: blogId },
      include: { translations: true },
    });

    const translated = getTranslatedContent(blog.translations, locale);

    await mailer.sendMail({
      from: `"Byte of Me" <${env.EMAIL_SERVER_USER}>`,
      to: env.EMAIL,
      subject: `New comment on: ${translated?.title ?? 'Your blog'}`,
      replyTo: userEmail,
      text: `New comment on "${translated?.title}"\n\nFrom: ${userEmail}\n\nContent:\n${content}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>New Comment Notification</h2>
          <p><strong>Blog:</strong> ${escapeHtml(translated?.title ?? 'Unknown')}</p>
          <p><strong>From:</strong> ${escapeHtml(userEmail ?? 'anonymous')}</p>
          <hr />
          <p><strong>Comment:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(content)}</p>
          ${
            blog?.slug
              ? `<p style="margin-top:16px;"><a href="${process.env.NEXT_PUBLIC_APP_URL}/blog/${blog.slug}">View Blog</a></p>`
              : ''
          }
        </div>
      `,
    });
    logger.info(`Comment notification sent for ${translated?.title}`);
  } catch (e) {
    logger.error(`Failed to send comment notification: ${getErrorMessage(e)}`);
  }
}
