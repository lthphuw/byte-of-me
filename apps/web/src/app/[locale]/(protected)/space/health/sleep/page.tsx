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

/**
 * `?month=YYYY-MM` is the calendar's window, and it lives in the URL so the
 * screen's read can be sized by it — the reason month arrows were left out
 * when the calendar was still a picture. Only a page receives `searchParams`,
 * so the param is unwrapped here and validated in `SleepScreen`, which is the
 * component that knows what a valid month is and what to show instead.
 */
export default async function SleepPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const { month } = await searchParams;

  return <SleepScreen month={Array.isArray(month) ? month[0] : month} />;
}
