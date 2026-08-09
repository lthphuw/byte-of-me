import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),

    EMAIL: z.string().email().default('lthphuw@gmail.com'),
    // The site's sole authorisation identity — who `isSiteOwnerEmail()`
    // (see `@/shared/lib/auth/session.ts`) admits to the dashboard, /notes,
    // and every admin server action. Deliberately a *separate* key from
    // `EMAIL` above: `EMAIL` also does double duty as the public contact
    // address, the contact-form and comment-notification destination, and
    // a profile-lookup fallback — reusing it as the auth identity meant a
    // cosmetic change to the public contact address could silently revoke
    // the owner's own access. Optional, falling back to `EMAIL` when unset,
    // so a deployment that has never heard of this key behaves exactly as
    // before; a required key here would fail env validation at boot and
    // take the site down on deploy for no operational reason.
    OWNER_EMAIL: z.string().email().optional(),
    AUTHOR_ID: z.string(),

    // The R&D notebook's ingest credential. Both keys are optional so a
    // deployment that has never heard of them boots unchanged — but the route
    // refuses every request while either is unset. An absent token must read
    // as "closed", never as "no auth required".
    //
    // No `.min(32)` here, on purpose — same reasoning as `OWNER_EMAIL` above:
    // a set-but-short token would fail THIS schema at import time and take
    // the whole site down at boot over a config typo, not just this one
    // route. The 32-character floor is still enforced, but where it's
    // actually a security property rather than a boot gate: inside
    // `isAuthorizedRndToken` (`app/api/rnd/publish/route.ts`), which treats
    // a too-short configured token as unconfigured — fail-closed on this one
    // route, without a short value anywhere taking down the site.
    RND_PUBLISH_TOKEN: z.string().optional(),
    RND_PUBLISH_OWNER_EMAIL: z.string().email().optional(),

    AUTH_URL: z.string(),
    AUTH_SECRET: z.string(),

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

    SUPABASE_S3_STORAGE_REGION: z.string(),
    SUPABASE_S3_STORAGE_ENDPOINT: z.string(),
    SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT: z.string(),
    SUPABASE_S3_STORAGE_ACCESS_KEY: z.string(),
    SUPABASE_S3_STORAGE_SECRET_KEY: z.string(),
    SUPABASE_S3_STORAGE_BUCKET: z.string().default('byte-of-me'),

    // 'test' is included because `bun test` sets NODE_ENV to 'test' before any
    // preload runs (see apps/web/test-setup.ts) and this schema is validated
    // eagerly at import time — without it, importing any module that reaches
    // this file under `bun test` throws "Invalid environment variables".
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

    RND_PUBLISH_TOKEN: process.env.RND_PUBLISH_TOKEN,
    RND_PUBLISH_OWNER_EMAIL: process.env.RND_PUBLISH_OWNER_EMAIL,

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
