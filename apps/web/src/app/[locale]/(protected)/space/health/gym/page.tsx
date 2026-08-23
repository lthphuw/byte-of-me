import type { Metadata } from 'next';

import { GymScreen } from '@/widgets/health/gym-screen';

export const metadata: Metadata = {
  title: 'Gym',
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
 * Workout history, and the way into a session. `GymScreen` is the async
 * boundary — no extra `<Suspense>`, because the route's own `loading.tsx`
 * already covers the wait.
 */
export default function GymPage() {
  return <GymScreen />;
}
