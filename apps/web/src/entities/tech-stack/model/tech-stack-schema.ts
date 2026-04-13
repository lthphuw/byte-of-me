import { z } from 'zod';

export const techStackSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase and use "-"'),
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  logoId: z.string().nullable(),
});

export type TechStackFormValues = z.infer<typeof techStackSchema>;
