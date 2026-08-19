'use server';

import { type ContactMessage, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { escapeHtml, sanitizeHtml } from '@byte-of-me/ui/lib/sanitize';
import { revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';

import {
  type ContactMessageFormValues,
  contactMessageSchema,
} from '@/entities/contact-message/model/contact-message-schema';
import type { ContactMessageFailureCode } from '@/entities/contact-message/model/types';
import { mailer } from '@/shared/api';
import { env } from '@/shared/config/env';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

// The form is public and bilingual, so every failure carries a code the client
// can translate; `errorMsg` stays English for the log and for callers that do
// not know the codes.
export async function sendContactMessage(
  values: ContactMessageFormValues
): Promise<ApiResponse<ContactMessage, ContactMessageFailureCode>> {
  const parsed = parseInput(contactMessageSchema, values);
  if (!parsed.ok) {
    return { success: false, errorCode: 'invalid', errorMsg: parsed.errorMsg };
  }

  // Anonymous write path: throttle per client IP before touching the DB.
  const headerList = await headers();
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed } = await checkRateLimit({
    key: `contact:${ip}`,
    limit: 3,
    windowSec: 600,
  });
  if (!allowed) {
    return {
      success: false,
      errorCode: 'rate-limited',
      errorMsg: 'Too many messages sent. Please try again later.',
    };
  }

  try {
    const msg = await saveContactToDb(parsed.data);

    // Deferred: SMTP must not hold the response open, and the serverless
    // invocation must not be frozen mid-send.
    after(async () => {
      await sendNotificationEmail(parsed.data);
    });

    revalidateTag(CACHE_TAGS.CONTACT, 'max');
    return { success: true, data: msg };
  } catch (error) {
    logger.error(`Send contact error: ${getErrorMessage(error)}`);
    return {
      success: false,
      errorCode: 'unknown',
      errorMsg: 'Something went wrong. Please try again.',
    };
  }
}

async function sendNotificationEmail(data: ContactMessageFormValues) {
  const sanitizedMessage = sanitizeHtml(data.message);

  try {
    await mailer.sendMail({
      from: `"${data.name}" <${env.EMAIL_SERVER_USER}>`,
      replyTo: data.email,
      to: env.EMAIL,
      subject: `New Contact Message: ${data.subject || 'No Subject'}`,
      text: `From: ${data.name} (${data.email})\n\nMessage:\n${sanitizedMessage.replace(/<[^>]*>/g, '')}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>New message from <b>Byte of Me</b></h2>
          <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(data.subject || 'N/A')}</p>
          <hr />
          <p style="white-space: pre-wrap;">${sanitizedMessage}</p>
        </div>
      `,
    });
    logger.info(`Email sent for subject: ${data.subject}`);
  } catch (e) {
    logger.error(`Send email failed: ${getErrorMessage(e)}`);
  }
}

async function saveContactToDb(data: ContactMessageFormValues) {
  return await prisma.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      subject: data.subject || null,
      message: data.message || '',
      userId: env.AUTHOR_ID,
    },
  });
}
