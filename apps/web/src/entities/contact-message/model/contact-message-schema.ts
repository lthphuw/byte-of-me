import { z } from 'zod';

export const contactMessageSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(100, 'Name is too long'),

  email: z.string().email('Invalid email address'),

  subject: z
    .string()
    .max(200, 'Subject is too long')
    .optional()
    .or(z.literal('')),

  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message is too long'),
});

export type ContactMessageFormValues = z.infer<typeof contactMessageSchema>;
