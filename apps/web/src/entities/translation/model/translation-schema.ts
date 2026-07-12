import { z } from 'zod';

export const translationSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(
      /^\S+(\.\S+)*$/,
      'Key must be a dot-separated path without whitespace'
    ),
  language: z.string().min(1, 'Language is required'),
  value: z.string().min(1, 'Value is required'),
});

export type TranslationFormValues = z.infer<typeof translationSchema>;
