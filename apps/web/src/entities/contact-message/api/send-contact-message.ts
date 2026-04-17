'use server';

import { prisma } from '@byte-of-me/db';
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
    return {
      success: false,
      errors: parsed.error.flatten(),
    };
  }

  try {
    const data = parsed.data;

    const msg = await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject || null,
        message: data.message || '',
        userId: env.AUTHOR_ID,
      },
    });

    const message = sanitizeHtml(data.message);
    await mailer.sendMail({
      from: `"${data.name}" <${process.env.SMTP_USER}>`,
      replyTo: data.email,
      to: env.EMAIL,
      subject: `New Contact Message: ${data.subject || 'No Subject'}`,
      text: `From: ${data.name} (${data.email})\n\nMessage:\n${message.replace(
        /<[^>]*>/g,
        ''
      )}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>New message from <b>Byte of Me</b></h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Subject:</strong> ${data.subject || 'N/A'}</p>
          <hr />
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    revalidateTag(CACHE_TAGS.CONTACT, 'max');

    return { success: true, data: msg };
  } catch (error: Any) {
    console.error(`Send contact get error: ${error.message}`);

    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}
