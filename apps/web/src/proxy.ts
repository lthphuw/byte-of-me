import { auth } from '@/features/auth/lib/auth';

import { type NextRequest,NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default auth(async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(req);
  if (intlResponse) return intlResponse;

  return NextResponse.next();
});

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
