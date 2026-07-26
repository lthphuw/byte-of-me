'use client';

import React, { createContext, type ReactNode,useContext } from 'react';
import { MotionProvider, Toaster } from '@byte-of-me/ui';
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google';
import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/next';

import { TailwindIndicator } from '@/app/providers/_components';
import { TanStackQueryProvider } from '@/app/providers/tan-stack-query-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { env } from '@/shared/config/env';





type GlobalContextType = object;

const GlobalContext = createContext<GlobalContextType | null>(null);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  return (
    <GlobalContext.Provider value={{}}>
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
          <NextGoogleAnalytics gaId={`${env.NEXT_PUBLIC_GA_ID}`} />
          <VercelSpeedInsights />
        </ThemeProvider>
        </MotionProvider>
      </TanStackQueryProvider>
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};
