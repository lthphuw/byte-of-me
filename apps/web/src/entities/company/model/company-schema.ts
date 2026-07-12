import { z } from 'zod';

export const companyTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),

  description: z.string().nullable().optional(),
});

export const companyTaskTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),

  content: z.string().min(1, 'Content is required'),
});

export const companyTaskSchema = z.object({
  id: z.string().optional(),

  sortOrder: z.number(),

  translations: z.array(companyTaskTranslationSchema).min(1),
});

export const companyRoleTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),

  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
});

export const companyRoleSchema = z.object({
  id: z.string().optional(),

  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),

  translations: z.array(companyRoleTranslationSchema).min(1),
  tasks: z.array(companyTaskSchema),
});

export const companySchema = z.object({
  id: z.string().optional(),

  company: z.string().min(1, 'Company name is required'),
  location: z.string().min(1, 'Location is required'),

  startDate: z.date(),
  endDate: z.date().nullable().optional(),

  logoId: z.string().nullable().optional(),

  translations: z.array(companyTranslationSchema),
  techStackIds: z.array(z.string()),
  roles: z.array(companyRoleSchema),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
