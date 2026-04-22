'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import {
  type ContactMessageFormValues,
  contactMessageSchema,
} from '@/entities/contact-message/model/contact-message-schema';
import { mailer } from '@/shared/api/mailer';
import { env } from '@/shared/config/env';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { sanitizeHtml } from '@/shared/lib/uuid';

export async function sendContactMessage(values: ContactMessageFormValues) {
  const parsed = contactMessageSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten() };
  }

  try {
    const msg = await saveContactToDb(parsed.data);
    sendNotificationEmail(parsed.data);

    revalidateTag(CACHE_TAGS.CONTACT, 'max');
    return { success: true, data: msg };
  } catch (error: any) {
    logger.error(`Send contact error: ${error.message}`);
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
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
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Subject:</strong> ${data.subject || 'N/A'}</p>
          <hr />
          <p style="white-space: pre-wrap;">${sanitizedMessage}</p>
        </div>
      `,
    });
    logger.info(`Email sent for subject: ${data.subject}`);
  } catch (e: any) {
    logger.error(`Send email failed: ${e.message}`);
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
