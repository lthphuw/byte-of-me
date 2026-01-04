import * as z from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine((val) => !val || /^https?:\/\//.test(val), {
    message: 'URL must start with http:// or https://',
  });

export const profileSchema = z.object({
  name: z.string().min(2),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  greeting: z.string(),
  tagLine: z.string(),
  bio: z.string(),
  aboutMe: z.string(),
  quote: z.string().optional(),
  quoteAuthor: z.string().optional(),
  linkedIn: optionalUrl,
  github: optionalUrl,
  twitter: optionalUrl,
  portfolio: optionalUrl,
});

export type ProfileSchema = z.infer<typeof profileSchema>;
