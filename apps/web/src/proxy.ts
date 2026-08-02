import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from '@/shared/i18n/routing';
import { PATHNAME_HEADER } from '@/shared/lib/constants';

// This middleware only handles locale negotiation and rewriting. It reads no
// session, so it must not pull the NextAuth config into the edge bundle.
// Authorization lives elsewhere: `app/[locale]/(protected)/layout.tsx` gates the
// dashboard via `getAuthenticatedAdmin()`, and every server action goes through
// the per-action `requireAdmin()` / `requireUser()` guards in `shared/lib/auth`.
const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Stamped before delegating, not after: next-intl builds the forwarded request
  // headers with `new Headers(request.headers)` inside its own handler, so a
  // header added afterwards would never reach the server components. Reading a
  // pathname is still not reading a session — the note above holds.
  request.headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  return handleI18nRouting(request);
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
