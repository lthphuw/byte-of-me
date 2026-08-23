import type { Metadata } from 'next';

import { DailyScreen } from '@/widgets/daily/daily-screen';

export const metadata: Metadata = {
  title: 'Daily',
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
 * so the param is unwrapped here and validated in `DailyScreen`, which is the
 * component that knows what a valid month is and what to show instead.
 */
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const { month } = await searchParams;

  return <DailyScreen month={Array.isArray(month) ? month[0] : month} />;
}
