import { env } from '@/env.mjs';





// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
export const turnstileSecretKey =
  env.NODE_ENV === 'production'
    ? env.TURNSTILE_SECRET_KEY
    : '1x0000000000000000000000000000000AA';
