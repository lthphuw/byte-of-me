import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),

    EMAIL: z.string().email().default('lthphuw@gmail.com'),
    AUTHOR_ID: z.string(),

    AUTH_URL: z.string(),
    AUTH_SECRET: z.string(),

    EMAIL_SERVER_HOST: z.string(),
    EMAIL_SERVER_PORT: z.coerce.number(),
    EMAIL_SERVER_USER: z.string(),
    EMAIL_SERVER_PASSWORD: z.string(),
    EMAIL_FROM: z.string(),

    SUPABASE_S3_STORAGE_REGION: z.string(),
    SUPABASE_S3_STORAGE_ENDPOINT: z.string(),
    SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT: z.string(),
    SUPABASE_S3_STORAGE_ACCESS_KEY: z.string(),
    SUPABASE_S3_STORAGE_SECRET_KEY: z.string(),
    SUPABASE_S3_STORAGE_BUCKET: z.string().default('byte-of-me'),

    NODE_ENV: z
      .enum(['development', 'production'])
      .optional()
      .default('development'),
  },

  client: {
    NEXT_PUBLIC_GA_ID: z.string().default(''),
    NEXT_PUBLIC_AUTHOR_EMAIL: z.string().default('lthphuw@gmail.com'),
    NEXT_PUBLIC_ENV: z
      .enum(['development', 'production'])
      .optional()
      .default('development'),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,

    EMAIL: process.env.EMAIL,
    AUTHOR_ID: process.env.AUTHOR_ID,
    NODE_ENV: process.env.NODE_ENV,

    AUTH_URL: process.env.AUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,

    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,

    SUPABASE_S3_STORAGE_REGION: process.env.SUPABASE_S3_STORAGE_REGION,
    SUPABASE_S3_STORAGE_ENDPOINT: process.env.SUPABASE_S3_STORAGE_ENDPOINT,
    SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT:
      process.env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT,
    SUPABASE_S3_STORAGE_ACCESS_KEY: process.env.SUPABASE_S3_STORAGE_ACCESS_KEY,
    SUPABASE_S3_STORAGE_SECRET_KEY: process.env.SUPABASE_S3_STORAGE_SECRET_KEY,
    SUPABASE_S3_STORAGE_BUCKET: process.env.SUPABASE_S3_STORAGE_BUCKET,

    // Client
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_AUTHOR_EMAIL: process.env.NEXT_PUBLIC_AUTHOR_EMAIL,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  },
});
