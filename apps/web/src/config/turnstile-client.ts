import { env } from '@/env.mjs';

// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
export const turnstileSitekey =
  env.NEXT_PUBLIC_ENV === 'production'
    ? env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    : '1x00000000000000000000AA';
