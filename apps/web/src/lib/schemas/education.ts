import { z } from 'zod';

export const educationSubItemSchema = z.object({
  title: z.string().trim().min(1, 'Sub item title is required').max(200),

  message: z.string().trim().min(1, 'Sub item message is required'),
});

export const educationSchema = z.object({
  timeline: z
    .string()
    .trim()
    .min(1, 'EducationTimeline is required')
    .max(100),

  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200),

  message: z
    .string()
    .trim()
    .min(1, 'Message is required'),

  icon: z.string().optional(),

  subItems: z.array(educationSubItemSchema).default([]),
});

export type EducationSchema = z.infer<typeof educationSchema>;
