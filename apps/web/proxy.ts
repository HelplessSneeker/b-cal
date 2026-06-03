import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];
const OPEN_ROUTES = [
  '/verify-email',
  '/check-email',
  '/health',
  // Social-share preview image must be publicly fetchable by scrapers
  // (LinkedIn, WhatsApp, …) — it has no file extension, so the matcher
  // below does not exclude it.
  '/opengraph-image',
];
const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

function buildCspHeader(nonce: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
  const isProduction = process.env.NODE_ENV === 'production';

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${backendUrl}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ];

  return directives.join('; ');
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has(ACCESS_TOKEN_COOKIE);
  const hasRefreshToken = request.cookies.has(REFRESH_TOKEN_COOKIE);
  const isAuthenticated = hasAccessToken || hasRefreshToken;

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  let response: NextResponse;

  // Allow verification routes regardless of auth state
  if (OPEN_ROUTES.some((route) => pathname.startsWith(route))) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  // Auth pages: redirect authenticated users to the app
  else if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      response = NextResponse.redirect(new URL('/', request.url));
    } else {
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  }
  // Protect all other routes
  else if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
