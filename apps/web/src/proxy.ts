import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from '@/shared/i18n/routing';
import { PATHNAME_HEADER } from '@/shared/lib/constants';

// Locale negotiation and rewriting only. No session is read, so the NextAuth config stays out of the
// edge bundle. Authorization lives in `(protected)/layout.tsx` (getAuthenticatedAdmin) and the
// per-action `requireAdmin()` / `requireUser()` guards in `shared/lib/auth`.
const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Stamped before delegating: next-intl copies the request headers inside its handler, so a header
  // added afterwards never reaches server components. A pathname is still not a session read.
  request.headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  return handleI18nRouting(request);
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
