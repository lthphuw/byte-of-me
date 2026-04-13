import * as z from 'zod';

export const userAuthLoginSchema = z.object({
  email: z.string().email(),
});

export type UserAuthLoginFormValues = z.infer<typeof userAuthLoginSchema>;
