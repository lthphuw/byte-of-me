import * as z from 'zod';

export const userAuthLoginSchema = z.object({
  email: z.string().email(),
});

export type UserAuthLoginSchema = z.infer<typeof userAuthLoginSchema>;
