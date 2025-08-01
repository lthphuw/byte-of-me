'use client';

import React, { ReactNode, createContext, useContext } from 'react';
import { Theme } from '@/contexts/theme';

import { Toaster } from '@/components/ui/toaster';
import { ChatIcon } from '@/components/chat-icon';
import { Integrations } from '@/components/intergations';
import { TailwindIndicator } from '@/components/tailwind-indicator';

type GlobalContextType = object;

const GlobalContext = createContext<GlobalContextType | null>(null);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  return (
    <GlobalContext.Provider value={{}}>
      <Theme attribute="class" defaultTheme="system" enableSystem>
        {/* Main content */}
        {children}

        {/* Floating chat icon (mobile) */}
        <ChatIcon />

        {/* Toast notifications */}
        <Toaster />

        {/* Show current Tailwind breakpoint (dev only) */}
        {process.env.NODE_ENV !== 'production' && <TailwindIndicator />}

        {/* Analytics & monitoring tools */}
        <Integrations />
      </Theme>
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
