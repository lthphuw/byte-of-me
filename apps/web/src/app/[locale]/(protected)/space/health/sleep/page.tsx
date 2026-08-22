import type { Metadata } from 'next';

import { SleepScreen } from '@/widgets/health/sleep-screen';

export const metadata: Metadata = {
  title: 'Sleep',
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

export default function SleepPage() {
  return <SleepScreen />;
}
