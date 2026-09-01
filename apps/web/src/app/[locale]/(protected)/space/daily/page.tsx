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

/** `?month=YYYY-MM` is the calendar's window, in the URL so the screen's read
 *  is SIZED by it. Only a page receives `searchParams`; `DailyScreen`
 *  validates, being the component that knows what a valid month is. */
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const { month } = await searchParams;

  return <DailyScreen month={Array.isArray(month) ? month[0] : month} />;
}
