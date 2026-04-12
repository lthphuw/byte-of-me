'use client';

import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google';
import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/next';
import type { ReactNode} from 'react';
import React, { createContext, useContext } from 'react';

import { TailwindIndicator } from '@/app/providers/_components';
import { TanStackQueryProvider } from '@/app/providers/tan-stack-query-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { env } from '@/env.mjs';
import { Toaster } from '@/shared/ui/toaster';





type GlobalContextType = object;

const GlobalContext = createContext<GlobalContextType | null>(null);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  return (
    <GlobalContext.Provider value={{}}>
      <TanStackQueryProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Main content */}
          {children}

          <Toaster />

          <TailwindIndicator />
          <NextGoogleAnalytics gaId={`${env.NEXT_PUBLIC_GA_ID}`} />
          <VercelSpeedInsights />
        </ThemeProvider>
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
