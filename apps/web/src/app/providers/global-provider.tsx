'use client';

import React, { type ReactNode } from 'react';
import { MotionProvider, Toaster } from '@byte-of-me/ui';
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google';
import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/next';

import { TailwindIndicator } from '@/app/providers/_components';
import { TanStackQueryProvider } from '@/app/providers/tan-stack-query-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  return (
    <TanStackQueryProvider>
      {/* MotionProvider sits at the root so `m.*` components animate on every
          route group. Anything rendered outside LazyMotion's tree falls back
          to a static render with no warning — dashboard and auth used to sit
          outside it, which forced shared components (Loading, CopyButton)
          onto eager `motion.*` imports and full framer in every bundle. */}
      <MotionProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Main content */}
          {children}

          <Toaster />

          <TailwindIndicator />
          {/* Literal `process.env.NEXT_PUBLIC_*` reads, never `@/shared/config/env`:
              that module carries the server zod schema, and importing it here
              shipped it (secret names included) to every route. */}
          <NextGoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID ?? ''} />
          <VercelSpeedInsights />
        </ThemeProvider>
      </MotionProvider>
    </TanStackQueryProvider>
  );
};
