import { headers } from 'next/headers';

import 'server-only';

/**
 * The zone a health screen resolves calendar days in.
 *
 * Every read in this module is keyed on a LOCAL date — `getSleepSummary` turns
 * "now" into a `localDate` before it can pick a window at all — so a server
 * component has to name a zone, and the only wrong answer is the server's own.
 * On Vercel that is UTC, which for an owner at UTC+7 rolls the day over at
 * 07:00 local: the night just logged would sit outside a window that claims to
 * end today, and the streak would drop by one every morning.
 *
 * `x-vercel-ip-timezone` is the same request-derived geo header
 * `track-blog-view.ts` already reads for `x-vercel-ip-country`. It is absent
 * off Vercel — in `next dev`, in tests, in a self-hosted run — and there the
 * process's own resolved zone is the developer's machine, which is the right
 * answer for exactly the local case where the header is missing.
 *
 * Deliberately NOT the same value the entry form sends. The form reads
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` from the device, which is
 * authoritative for the row being written; this only decides which window a
 * screen renders. The two disagree only while travelling, and then only about
 * whether an edge day falls inside a 14-day window.
 */
export async function getRequestTimeZone(): Promise<string> {
  const headerList = await headers();
  const fromEdge = headerList.get('x-vercel-ip-timezone');

  if (fromEdge && isValidTimeZone(fromEdge)) {
    return fromEdge;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}
