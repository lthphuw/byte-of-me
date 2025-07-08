import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { host } from './config/host';
import { env } from './env.mjs';
import { routing } from './i18n/routing';
import { rateLimitPerDay, rateLimitPerMinute } from './lib/rate-limiter';

const isProd = env.NEXT_PUBLIC_ENV === 'production';
const allowedOrigins = [host];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('Middleware triggered for pathname:', pathname);

  // Handle /api/chat (with or without locale prefix)
  if (pathname === '/api/chat' || pathname.match(/\/[a-z]{2}\/api\/chat/)) {
    console.log('Handling /api/chat request');

    // CORS
    const origin = request.headers.get('origin');
    if (isProd && origin && !allowedOrigins.includes(origin)) {
      console.log('Forbidden origin:', origin);
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      console.log('Handling OPTIONS preflight for /api/chat');
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

    // Rate limiting
    const ip = getClientIp(request);
    console.log('Client IP:', ip);

    try {
      const [perMinute, perDay] = await Promise.all([
        rateLimitPerMinute.limit(ip),
        rateLimitPerDay.limit(ip),
      ]);

      console.log('Rate limit per minute:', perMinute);
      console.log('Rate limit per day:', perDay);
      if (!perMinute.success || !perDay.success) {
        const reason = !perMinute.success
          ? 'Minute rate limit exceeded'
          : 'Daily rate limit exceeded';
        console.log('Rate limit exceeded:', reason, { perMinute, perDay });
        return new NextResponse(`Too Many Requests: ${reason}`, {
          status: 429,
        });
      }
      // Create response only if rate limit is not exceeded
      const response = NextResponse.next();

      return response;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  // Skip all other /api/* routes
  if (pathname.startsWith('/api/')) {
    console.log('Skipping other API route:', pathname);
    return NextResponse.next();
  }

  // Apply next-intl for non-API routes
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)', // Non-static routes
    '/api/chat', // Include /api/chat
    '/:locale/api/chat', // Include locale-prefixed /api/chat
  ],
};

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded
    ? forwarded.split(',')[0]?.trim()
    : realIp || (request as any).ip || 'anonymous';
  console.log('IP headers:', {
    'x-forwarded-for': forwarded,
    'x-real-ip': realIp,
    'request.ip': (request as any).ip,
    resolvedIp: ip,
  });
  return ip;
}
