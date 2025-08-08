'use client';

import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google';

import { env } from '@/env.mjs';





export function GoogleAnalytics() {
  return <NextGoogleAnalytics gaId={`${env.NEXT_PUBLIC_GA_ID}`} />;
}
