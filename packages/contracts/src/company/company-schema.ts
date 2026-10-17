import { z } from 'zod';

const companyTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),

  description: z.string().nullable().optional(),
});

const companyTaskTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),

  content: z.string().min(1, 'validation.required'),
});

const companyTaskSchema = z.object({
  id: z.string().optional(),

  sortOrder: z.number(),

  translations: z.array(companyTaskTranslationSchema).min(1),
});

const companyRoleTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),

  title: z.string().min(1, 'validation.required'),
  description: z.string().nullable().optional(),
});

const companyRoleSchema = z.object({
  id: z.string().optional(),

  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),

  translations: z.array(companyRoleTranslationSchema).min(1),
  tasks: z.array(companyTaskSchema),
});

export const companySchema = z.object({
  id: z.string().optional(),

  company: z.string().min(1, 'validation.required'),
  location: z.string().min(1, 'validation.required'),

  // zod 3 option names: `required_error` covers a cleared date, `invalid_type_error` a non-date.
  startDate: z.date({
    required_error: 'validation.required',
    invalid_type_error: 'validation.invalidDate',
  }),
  endDate: z.date().nullable().optional(),

  logoId: z.string().nullable().optional(),

  translations: z.array(companyTranslationSchema),
  techStackIds: z.array(z.string()),
  roles: z.array(companyRoleSchema),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
