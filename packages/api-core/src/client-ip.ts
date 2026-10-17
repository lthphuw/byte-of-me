import { isIP } from 'node:net';

/**
 * Rate-limit key, most trusted header first: Vercel's (not overwritable), then
 * `x-real-ip`, then `x-forwarded-for`, which a client controls off Vercel.
 * Non-IP values are skipped; `'unknown'` is the shared bucket when none is left.
 */
export function getClientIp(headerList: Pick<Headers, 'get'>): string {
  const candidates = [
    headerList.get('x-vercel-forwarded-for'),
    headerList.get('x-real-ip'),
    headerList.get('x-forwarded-for'),
  ];

  for (const candidate of candidates) {
    const ip = candidate?.split(',')[0]?.trim();

    if (ip && isIP(ip) !== 0) {
      return ip;
    }
  }

  return 'unknown';
}
