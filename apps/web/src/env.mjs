import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    HOST: z.string(),
    PRISMA_CACHE_SWR: z.coerce.number().default(86400),
    PRISMA_CACHE_TTL: z.coerce.number().default(86400),

    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),

    NEXT_EMAIL: z.string().email().default('lthphuw@gmail.com'),

    AUTH_URL: z.string(),
    AUTH_SECRET: z.string(),

    SMTP_HOST: z.string(),
    SMTP_PORT: z.string(),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    SMTP_FROM: z.string(),

    NODE_ENV: z
      .enum(['development', 'production'])
      .optional()
      .default('development'),
  },

  client: {
    NEXT_CACHE: z.coerce.number().default(86400),
    NEXT_PUBLIC_GA_ID: z.string().default(''),
    NEXT_PUBLIC_ENV: z
      .enum(['development', 'production'])
      .optional()
      .default('development'),
  },

  runtimeEnv: {
    HOST: process.env.HOST,

    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,

    NEXT_EMAIL: process.env.NEXT_EMAIL,
    NODE_ENV: process.env.NODE_ENV,

    AUTH_URL: process.env.AUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,

    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,

    // Client
    NEXT_CACHE: process.env.NEXT_CACHE,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  },
});
