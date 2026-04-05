'use server';

import { prisma } from '@byte-of-me/db';

import { contactMessageSchema } from '@/lib/schemas/contact-message.schema';

export async function sendContactMessage(values: unknown, userId: string) {
  const parsed = contactMessageSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten(),
    };
  }

  try {
    const data = parsed.data;

    await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject || null,
        message: data.message || '',
        userId,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error(`Send contact get error: ${error.message}`);

    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}
