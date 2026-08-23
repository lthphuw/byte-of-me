import type { Metadata } from 'next';

import { ExerciseScreen } from '@/widgets/gym/exercise-screen';

export const metadata: Metadata = {
  title: 'Exercises',
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
 * The exercise catalogue. `ExerciseScreen` is the async boundary — no extra
 * `<Suspense>`, because the route's own `loading.tsx` already covers the wait.
 */
export default function ExercisesPage() {
  return <ExerciseScreen />;
}
