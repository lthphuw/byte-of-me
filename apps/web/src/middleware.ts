import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { host } from './config/host';
import { env } from './env.mjs';
import { routing } from './i18n/routing';

const isProd = env.NEXT_PUBLIC_ENV === 'production';
const allowedOrigins = [host];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle /api/chat (with or without locale prefix)
  if (pathname === '/api/chat' || pathname.match(/\/[a-z]{2}\/api\/chat/)) {
    // CORS
    const origin = request.headers.get('origin');
    if (isProd && origin && !allowedOrigins.includes(origin)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }
    const response = NextResponse.next();

    return response;
  }

  // Skip all other /api/* routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Apply next-intl for non-API routes
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)', // Non-static routes
    '/api/chat', // Include /api/chat
  ],
};
