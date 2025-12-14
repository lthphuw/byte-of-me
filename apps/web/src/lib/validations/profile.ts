import * as z from 'zod';

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
  linkedIn: z.string().url().or(z.literal('')).optional(),
  github: z.string().url().or(z.literal('')).optional(),
  twitter: z.string().url().or(z.literal('')).optional(),
  portfolio: z.string().url().or(z.literal('')).optional(),
  image: z.string().optional(),
});
