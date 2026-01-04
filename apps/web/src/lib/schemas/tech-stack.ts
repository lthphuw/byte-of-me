import { z } from 'zod';

export const techStackSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase and use "-"'),
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  logo: z.string().nullable().optional(),
});

export type TechStackForm = z.infer<typeof techStackSchema>;
