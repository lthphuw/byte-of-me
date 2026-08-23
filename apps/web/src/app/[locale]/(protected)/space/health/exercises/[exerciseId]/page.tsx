import type { Metadata } from 'next';

import { ExerciseDetailScreen } from '@/widgets/gym/exercise-detail-screen';

export const metadata: Metadata = {
  title: 'Exercise',
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
 * One exercise's own history. `ExerciseDetailScreen` is the async boundary —
 * no extra `<Suspense>`, because the route's own `loading.tsx` already covers
 * the wait.
 *
 * `params` is a promise in Next 16 and is awaited here rather than inside the
 * widget, so the widget stays a plain function of the id it is given.
 */
export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;

  return <ExerciseDetailScreen exerciseId={exerciseId} />;
}
