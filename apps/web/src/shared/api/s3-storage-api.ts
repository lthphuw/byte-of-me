import { Storage } from '@byte-of-me/storage';

import { env } from '@/env.mjs';





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
