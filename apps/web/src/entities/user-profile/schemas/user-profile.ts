import { z } from 'zod';

export const userProfileSchema = z.object({
  socialLinks: z.array(
    z.object({
      platform: z.string().min(1, 'Platform is required'),
      url: z.string(),
      sortOrder: z.coerce.number().min(0),
    })
  ),
  birthdate: z.coerce.date().nullable().optional(),
  translations: z
    .array(
      z.object({
        language: z.string().min(1, 'Language is required'),
        displayName: z.string().min(1, 'Display name is required'),
        tagLine: z.string().nullable().optional(),
        greeting: z.string().nullable().optional(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        bio: z.string().nullable().optional(),
        aboutMe: z.any().nullable().optional(),
        quote: z.string().nullable().optional(),
        quoteAuthor: z.string().nullable().optional(),
      })
    )
    .min(1),
});

export type ProfileFormValues = z.infer<typeof userProfileSchema>;
