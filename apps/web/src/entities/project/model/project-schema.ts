import { z } from 'zod';

export const projectTranslationSchema = z.object({
  language: z.string(),
  title: z.string(),
  description: z.string(),
});

// Messages are `validation.*` keys: the form translates them at display time.
export const projectCoauthorSchema = z.object({
  fullName: z.string().min(1, 'validation.required'),
  email: z
    .string()
    .email('validation.invalidEmail')
    .optional()
    .or(z.literal('')),
});

export const projectSchema = z.object({
  slug: z.string().min(1, 'validation.required'),
  githubLink: z
    .string()
    .url('validation.invalidUrl')
    .optional()
    .or(z.literal('')),
  liveLink: z
    .string()
    .url('validation.invalidUrl')
    .optional()
    .or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isPublished: z.boolean(),
  techStackIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  coauthors: z.array(projectCoauthorSchema).optional(),
  translations: z.array(projectTranslationSchema),
});

export type ProjectFromValues = z.infer<typeof projectSchema>;
