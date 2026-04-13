'use server';

import { prisma } from '@byte-of-me/db';
import DOMPurify from 'isomorphic-dompurify';

import {
  contactMessage,
  type ContactMessageFormValues,
} from '@/entities/contact-message/schemas/contact-message';
import { mailer } from '@/shared/api/mailer';
import { env } from '@/shared/config/env';

export async function sendContactMessage(values: ContactMessageFormValues) {
  const parsed = contactMessage.safeParse(values);

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

    const message = DOMPurify.sanitize(data.message);
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

    return { success: true, data: msg };
  } catch (error: any) {
    console.error(`Send contact get error: ${error.message}`);

    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}
