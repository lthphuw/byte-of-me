import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { auth } from '@/lib/auth';

import { host } from './config/host';
import { env } from './env.mjs';
import { routing } from './i18n/routing';

const isProd = env.NEXT_PUBLIC_ENV === 'production';
const allowedOrigins = [host];

const intlMiddleware = createMiddleware(routing);

export default auth(async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin');

  // 1) /api/chat – xử lý CORS + proxy
  if (pathname === '/api/chat' || pathname.match(/\/[a-z]{2}\/api\/chat/)) {
    // CORS check
    if (isProd && origin && !allowedOrigins.includes(origin)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 204 });
      if (origin) res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS',
      );
      res.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      return res;
    }

    return NextResponse.next();
  }

  // 2) Bỏ qua các route API khác
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 3) next-intl middleware
  const intlResponse = intlMiddleware(req);
  if (intlResponse) return intlResponse;

  // 4) Protected routes – auth middleware (req.auth được inject bởi auth wrapper)
  const protectedRoutes = ['/dashboard'];
  if (protectedRoutes.some((r) => pathname.startsWith(r))) {
    if (!req.auth) {
      return NextResponse.redirect(
        new URL('/auth/login', req.nextUrl.origin),
      );
    }
  }

  return NextResponse.next();
});

// ==========================
//  Matcher
// ==========================
export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)',
    '/api/chat',
  ],
};
