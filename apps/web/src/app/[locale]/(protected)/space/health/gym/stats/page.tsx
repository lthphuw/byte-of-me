import type { Metadata } from 'next';

import { GymStatsScreen } from '@/widgets/health/gym-stats-screen';

export const metadata: Metadata = {
  title: 'Gym statistics',
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
 * Volume, weekly exposure, training load and progression. `GymStatsScreen` is
 * the async boundary — no extra `<Suspense>`, because the route's own
 * `loading.tsx` already covers the wait.
 */
export default function GymStatsPage() {
  return <GymStatsScreen />;
}
