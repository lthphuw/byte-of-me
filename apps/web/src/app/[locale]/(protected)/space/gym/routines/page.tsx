import type { Metadata } from 'next';

import { RoutinesScreen } from '@/widgets/gym/routines-screen';

export const metadata: Metadata = {
  title: 'Routines',
  description: 'Private health log. Never published.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * Routine management. `RoutinesScreen` is the async boundary — no extra
 * `<Suspense>`, because the route's own `loading.tsx` already covers the wait.
 */
export default function RoutinesPage() {
  return <RoutinesScreen />;
}
