import createMiddleware from 'next-intl/middleware';

import { routing } from '@/shared/i18n/routing';

// This middleware only handles locale negotiation and rewriting. It reads no
// session, so it must not pull the NextAuth config into the edge bundle.
// Authorization lives elsewhere: `app/[locale]/(protected)/layout.tsx` gates the
// dashboard via `getAuthenticatedAdmin()`, and every server action goes through
// the per-action `requireAdmin()` / `requireUser()` guards in `shared/lib/auth`.
export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
