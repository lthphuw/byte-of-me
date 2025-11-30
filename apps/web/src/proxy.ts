import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { host } from './config/host';
import { env } from './env.mjs';
import { routing } from './i18n/routing';

const isProd = env.NEXT_PUBLIC_ENV === 'production';
const allowedOrigins = [host];

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // const method = request.method;
  const origin = request.headers.get('origin');
  // const requestHeaders = Object.fromEntries(request.headers.entries());

  // // Log incoming request
  // logger().info('Incoming request', {
  //   method,
  //   url: `${pathname}${search}`,
  //   origin,
  //   headers: requestHeaders,
  // });

  // Handle /api/chat (with or without locale prefix)
  if (pathname === '/api/chat' || pathname.match(/\/[a-z]{2}\/api\/chat/)) {
    // CORS
    if (isProd && origin && !allowedOrigins.includes(origin)) {
      // logger().warn('Forbidden request due to invalid origin', { origin });
      // logger().info('Response sent', {
      //   status: 403,
      //   headers: Object.fromEntries(response.headers.entries()),
      // });
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
      // logger().info('Response sent (preflight)', {
      //   status: 204,
      //   headers: Object.fromEntries(response.headers.entries()),
      // });
      return response;
    }

    const response = NextResponse.next();
    // logger().info('Response sent', {
    //   status: response.status,
    //   headers: Object.fromEntries(response.headers.entries()),
    // });
    return response;
  }

  // Skip all other /api/* routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    // logger().debug('Response sent (skipped API route)', {
    //   status: response.status,
    //   headers: Object.fromEntries(response.headers.entries()),
    // });
    return response;
  }

  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)', // Non-static routes
    '/api/chat', // Include /api/chat
  ],
};
