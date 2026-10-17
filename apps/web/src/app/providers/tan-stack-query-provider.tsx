'use client';

import { useState } from 'react';
import { makeQueryClient } from '@byte-of-me/query';
import { QueryClientProvider } from '@tanstack/react-query';

export function TanStackQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/*<ReactQueryDevtools initialIsOpen={false} />*/}
    </QueryClientProvider>
  );
}
