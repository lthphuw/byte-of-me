'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { escapeHtml } from '@byte-of-me/ui';
import { revalidateTag } from 'next/cache';
import { after } from 'next/server';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import type { PublicComment } from '@/entities/comment/model';
import { mailer } from '@/shared/api';
import { env } from '@/shared/config/env';
import { host } from '@/shared/config/host';
import { requireUser } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const postCommentSchema = z.object({
  blogId: idSchema,
  content: z
    .string()
    .trim()
    .min(2, 'Comment is too short')
    .max(5000, 'Comment is too long'),
  parentId: z.string().min(1).optional(),
});

export async function postComment(
  blogId: string,
  content: string,
  parentId?: string
): Promise<ApiResponse<PublicComment>> {
  const locale = await getLocale();
  const user = await requireUser();

  const parsed = parseInput(postCommentSchema, { blogId, content, parentId });
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

  const { allowed } = await checkRateLimit({
    key: `comment:${user.id}`,
    limit: 5,
    windowSec: 60,
  });
  if (!allowed) {
    return {
      success: false,
      errorMsg: 'Too many comments posted. Please try again in a minute.',
    };
  }

  try {
    const comment = await createCommentInDb(blogId, content, user.id, parentId);

    // Deferred: SMTP must not hold the response open, and the serverless
    // invocation must not be frozen mid-send.
    after(async () => {
      await sendCommentNotification(
        blogId,
        content,
        user.email || 'anonymous',
        locale
      );
    });

    revalidateTag(CACHE_TAGS.COMMENT, 'default');

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
    return { success: false, errorMsg: 'Failed to post comment' };
  }
}

async function createCommentInDb(
  blogId: string,
  content: string,
  userId: string,
  parentId?: string
) {
  return prisma.comment.create({
    data: {
      blogId,
      userId,
      parentId: parentId ?? null,
      content: content.trim(),
    },
  });
}

async function sendCommentNotification(
  blogId: string,
  content: string,
  userEmail: string,
  locale: string
) {
  try {
    // The email only needs the blog link and a localized title.
    const blog = await prisma.blog.findUniqueOrThrow({
      where: { id: blogId },
      select: {
        slug: true,
        translations: {
          where: { language: { in: getTranslationLanguages(locale) } },
          select: { language: true, title: true },
        },
      },
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
          <p><strong>Blog:</strong> ${escapeHtml(
            translated?.title ?? 'Unknown'
          )}</p>
          <p><strong>From:</strong> ${escapeHtml(userEmail ?? 'anonymous')}</p>
          <hr />
          <p><strong>Comment:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(content)}</p>
          ${
            blog?.slug
              ? `<p style="margin-top:16px;"><a href="${host}/${locale}/blogs/${blog.slug}">View Blog</a></p>`
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
