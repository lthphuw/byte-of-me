import type { Metadata } from 'next';

import { CorrelationScreen } from '@/widgets/health/correlation-screen';

export const metadata: Metadata = {
  title: 'Sleep and training',
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
 * The sleep-versus-training correlation. Its own top-level segment rather than
 * a page under `gym` or `sleep`, because it belongs to neither: the whole
 * measure is the join between them, and filing it under one of the two domains
 * would say the other is its subject matter.
 *
 * `CorrelationScreen` is the async boundary — no extra `<Suspense>`, because
 * the route's own `loading.tsx` already covers the wait.
 */
export default function InsightsPage() {
  return <CorrelationScreen />;
}
