// app/contexts/GlobalContext.tsx
'use client';

import React, { ReactNode, createContext, useContext } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';

import { env } from '@/env.mjs';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@/components/analytics';
import { BackgroundWrapper } from '@/components/background-wrapper';
import { ChatIcon } from '@/components/chat-icon';
import { SpeedInsights } from '@/components/speed-insight';
import { TailwindIndicator } from '@/components/tailwind-indicator';
import { ThemeProvider } from '@/components/theme-provider';

interface GlobalContextType {}

const GlobalContext = createContext<GlobalContextType | null>(null);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  return (
    <GlobalContext.Provider value={{}}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BackgroundWrapper />
        {children}
        <Analytics />
        <SpeedInsights />
        <Toaster />
        <TailwindIndicator />
        <GoogleAnalytics gaId={`${env.NEXT_PUBLIC_GA_ID}`} />
        <ChatIcon />
      </ThemeProvider>
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within an GlobalProvider');
  }
  return context;
};
