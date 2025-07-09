import { env } from '@/env.mjs';

export const turnstileScriptURL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';

// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
export const turnstileSitekey =
  env.NEXT_PUBLIC_ENV === 'production'
    ? env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    : '1x00000000000000000000AA';
