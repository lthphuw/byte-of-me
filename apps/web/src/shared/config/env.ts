import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

import 'server-only';

// Only the real production deployment must name its owner. `VERCEL_ENV` is set
// by Vercel itself and separates production from preview, which also run with
// NODE_ENV=production. A host without it (self-hosted, local) is not enforced.
const requireOwnerEmail =
  process.env.NODE_ENV === 'production' &&
  process.env.VERCEL_ENV === 'production';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),

    EMAIL: z.string().email().default('lthphuw@gmail.com'),
    // The sole authorisation identity (`isSiteOwnerEmail()`). Separate from `EMAIL`, the public contact
    // address, so editing that cannot revoke the owner's access. Optional, falls back to `EMAIL`;
    // required in production so the `EMAIL` default never decides who is admin.
    OWNER_EMAIL: requireOwnerEmail
      ? z.string().email()
      : z.string().email().optional(),
    AUTHOR_ID: z.string(),

    AUTH_URL: z.string(),
    AUTH_SECRET: z.string().min(32),

    EMAIL_SERVER_HOST: z.string(),
    EMAIL_SERVER_PORT: z.coerce.number(),
    EMAIL_SERVER_USER: z.string(),
    EMAIL_SERVER_PASSWORD: z.string(),
    EMAIL_FROM: z.string(),

    // Github provdier
    AUTH_GITHUB_ID: z.string(),
    AUTH_GITHUB_SECRET: z.string(),

    // Google provider
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),

    // Open-source contributions read (public GraphQL search). Optional: without a token the section
    // does not render. A fine-grained token with public read and no scopes is enough.
    GITHUB_TOKEN: z.string().optional(),
    GITHUB_LOGIN: z.string().default('lthphuw'),

    SUPABASE_S3_STORAGE_REGION: z.string(),
    SUPABASE_S3_STORAGE_ENDPOINT: z.string(),
    SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT: z.string(),
    SUPABASE_S3_STORAGE_ACCESS_KEY: z.string(),
    SUPABASE_S3_STORAGE_SECRET_KEY: z.string(),
    SUPABASE_S3_STORAGE_BUCKET: z.string().default('byte-of-me'),

    // 'test' is included: `bun test` sets NODE_ENV to 'test' before any preload (bunfig.toml) and
    // this schema validates eagerly, so without it every import reaching this file throws.
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
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
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    AUTHOR_ID: process.env.AUTHOR_ID,
    NODE_ENV: process.env.NODE_ENV,

    AUTH_URL: process.env.AUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,

    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,

    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,

    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,

    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_LOGIN: process.env.GITHUB_LOGIN,

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
