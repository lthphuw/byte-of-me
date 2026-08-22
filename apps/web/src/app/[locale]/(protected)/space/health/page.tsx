import type { Metadata } from 'next';

import { HealthHub } from '@/widgets/health/health-hub';

export const metadata: Metadata = {
  title: 'Health',
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
 * The overview. `HealthHub` is the async boundary — no extra `<Suspense>`,
 * because the route's own `loading.tsx` already covers the wait.
 */
export default function HealthPage() {
  return <HealthHub />;
}
