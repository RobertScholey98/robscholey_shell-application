import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'rs_session';

/**
 * Edge middleware that protects sub-app routes by checking for a session cookie.
 * Does not validate the token (that would add latency) — just gates on cookie existence.
 * Unauthenticated requests are redirected to `/?next=<path>` to preserve intended destination.
 */
export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME);

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/** Matcher excludes homepage, _next internals, api routes, and static files (paths with extensions). */
export const config = {
  matcher: ['/((?!_next|api|[^/]+\\.[^/]+$).+)'],
};
