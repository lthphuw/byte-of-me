import { Storage } from '@byte-of-me/storage';

import 'server-only';

import { env } from '@/shared/config/env';

export const supabaseStorage = new Storage({
  region: env.SUPABASE_S3_STORAGE_REGION,
  endpoint: env.SUPABASE_S3_STORAGE_ENDPOINT,
  publicEndpoint: env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT,
  credentials: {
    accessKeyId: env.SUPABASE_S3_STORAGE_ACCESS_KEY,
    secretAccessKey: env.SUPABASE_S3_STORAGE_SECRET_KEY,
  },
  bucket: env.SUPABASE_S3_STORAGE_BUCKET,
});

/**
 * The bucket for objects that must not be readable by URL.
 *
 * `supabaseStorage` above points at a PUBLIC bucket — measured, not assumed:
 * a `GET` of one of its objects with no credentials at all answers 200. That
 * is correct for a blog cover and wrong for a file attached to a private note,
 * so attachments go here and reach a reader only through
 * `/api/notes/documents/[id]`, which checks the session first.
 *
 * `publicEndpoint` is still supplied because `Storage` requires it, but
 * nothing may call `getPublicUrl` on this instance: for a private bucket that
 * URL resolves to nothing, and a component rendering it would show a broken
 * image rather than fail loudly.
 */
export const privateStorage = new Storage({
  region: env.SUPABASE_S3_STORAGE_REGION,
  endpoint: env.SUPABASE_S3_STORAGE_ENDPOINT,
  publicEndpoint: env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT,
  credentials: {
    accessKeyId: env.SUPABASE_S3_STORAGE_ACCESS_KEY,
    secretAccessKey: env.SUPABASE_S3_STORAGE_SECRET_KEY,
  },
  bucket: env.SUPABASE_S3_PRIVATE_BUCKET,
});
