import { z } from 'zod';

export const projectSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  githubLink: z.string().url().optional().or(z.literal('')),
  liveLink: z.string().url().optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  techStackIds: z.array(z.string()).min(1, 'Select at least one tech stack'),
  tagIds: z.array(z.string()).optional(),
  coauthorIds: z.array(z.string()).optional(),
});

export type ProjectForm = z.infer<typeof projectSchema>;
