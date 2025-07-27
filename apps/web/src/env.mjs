/* eslint-disable no-undef */
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';





export const env = createEnv({
  server: {
    PRISMA_CACHE_SWR: z.coerce.number().default(86400),
    PRISMA_CACHE_TTL: z.coerce.number().default(86400),

    KV_URL: z.string().min(1),
    KV_REST_API_URL: z.string().min(1),
    KV_REST_API_TOKEN: z.string().min(1),
    KV_REST_API_READ_ONLY_TOKEN: z.string().min(1),
    REDIS_URL: z.string().default(''),

    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().min(1),

    NEXT_EMAIL: z.string().email().default('lthphuw@gmail.com'),

    RATE_LIMIT_CHAT_PER_MIN: z.coerce.number().default(5),
    RATE_LIMIT_CHAT_PER_DAY: z.coerce.number().default(15),

    TURNSTILE_SECRET_KEY: z.string().default(''),

    NODE_ENV: z
      .enum(['development', 'production'])
      .optional()
      .default('development'),
  },

  client: {
    NEXT_CACHE: z.coerce.number().default(86400),
    NEXT_PUBLIC_GA_ID: z.string().default(''),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().default(''),
    NEXT_PUBLIC_ENV: z
      .enum(['development', 'production'])
      .optional()
      .default('development'),
  },

  runtimeEnv: {
    PRISMA_CACHE_SWR: process.env.PRISMA_CACHE_SWR,
    PRISMA_CACHE_TTL: process.env.PRISMA_CACHE_TTL,

    KV_URL: process.env.KV_URL,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN,
    REDIS_URL: process.env.REDIS_URL,

    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,

    NEXT_EMAIL: process.env.NEXT_EMAIL,

    RATE_LIMIT_CHAT_PER_MIN: process.env.RATE_LIMIT_CHAT_PER_MIN,
    RATE_LIMIT_CHAT_PER_DAY: process.env.RATE_LIMIT_CHAT_PER_DAY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,

    // Client
    NEXT_CACHE: process.env.NEXT_CACHE,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  },
});
