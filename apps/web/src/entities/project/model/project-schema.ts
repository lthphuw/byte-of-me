import { z } from 'zod';

export const projectTranslationSchema = z.object({
  language: z.string(),
  title: z.string(),
  description: z.string(),
});

export const projectCoauthorSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
});

export const projectSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  githubLink: z.string().url().optional().or(z.literal('')),
  liveLink: z.string().url().optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  techStackIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  coauthors: z.array(projectCoauthorSchema).optional(),
  translations: z.array(projectTranslationSchema),
});

export type ProjectFromValues = z.infer<typeof projectSchema>;
