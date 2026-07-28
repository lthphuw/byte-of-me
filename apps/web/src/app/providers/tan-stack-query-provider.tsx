'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { makeQueryClient } from '@/shared/lib/query/get-query-client';

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
