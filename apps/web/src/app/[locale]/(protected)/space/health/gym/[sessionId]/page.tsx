import type { Metadata } from 'next';

import { WorkoutSessionScreen } from '@/widgets/health/workout-session-screen';

export const metadata: Metadata = {
  title: 'Workout',
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
 * One workout, open for entry.
 *
 * The dynamic segment sits beside the static `routines` one, which Next
 * resolves first — a session id is a cuid, so the two can never collide.
 */
export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <WorkoutSessionScreen sessionId={sessionId} />;
}
