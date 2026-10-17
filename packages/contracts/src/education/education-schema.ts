import { z } from 'zod';

export const educationTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),

  title: z.string().min(1, 'validation.required'),
  description: z.string().nullable().optional(),
});

export const educationAchievementTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),

  title: z.string().min(1, 'validation.required'),
  content: z.string().nullable().optional(),
});

export const educationAchievementSchema = z.object({
  id: z.string().optional(),

  sortOrder: z.number(),

  translations: z.array(educationAchievementTranslationSchema),
  imageIds: z.array(z.string()),
});

export const educationSchema = z.object({
  id: z.string().optional(),

  sortOrder: z.number(),

  // zod 3 option names: `required_error` covers a cleared date, `invalid_type_error` a non-date.
  startDate: z.date({
    required_error: 'validation.required',
    invalid_type_error: 'validation.invalidDate',
  }),
  endDate: z.date().nullable().optional(),

  logoId: z.string().nullable().optional(),
  translations: z.array(educationTranslationSchema),
  achievements: z.array(educationAchievementSchema),
});

export type EducationFormValues = z.infer<typeof educationSchema>;
