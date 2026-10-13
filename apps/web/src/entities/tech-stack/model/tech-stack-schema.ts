import { z } from 'zod';

export const techStackSchema = z.object({
  slug: z
    .string()
    .min(1, 'validation.required')
    .regex(/^[a-z0-9-]+$/, 'validation.invalidSlug'),
  name: z.string().min(1, 'validation.required'),
  group: z.string().min(1, 'validation.required'),
  logoId: z.string().nullable(),
});

export type TechStackFormValues = z.infer<typeof techStackSchema>;
