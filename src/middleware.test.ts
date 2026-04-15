import { describe, it, expect } from 'vitest';
import { middleware, config } from './middleware';
import { NextRequest } from 'next/server';

const BASE_URL = 'http://localhost:3000';

/** Creates a NextRequest with an optional session cookie. */
function createRequest(pathname: string, sessionToken?: string): NextRequest {
  const url = new URL(pathname, BASE_URL);
  const request = new NextRequest(url);

  if (sessionToken) {
    request.cookies.set('rs_session', sessionToken);
  }

  return request;
}

describe('middleware', () => {
  it('redirects to /?next=<path> when no session cookie', () => {
    const request = createRequest('/tracker/settings');
    const response = middleware(request);

    expect(response.status).toBe(307);
    const redirectUrl = new URL(response.headers.get('location')!);
    expect(redirectUrl.pathname).toBe('/');
    expect(redirectUrl.searchParams.get('next')).toBe('/tracker/settings');
  });

  it('allows request through when session cookie exists', () => {
    const request = createRequest('/tracker', 'sess_valid-token');
    const response = middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects nested paths with encoded next param', () => {
    const request = createRequest('/tracker/deep/nested/path');
    const response = middleware(request);

    expect(response.status).toBe(307);
    const redirectUrl = new URL(response.headers.get('location')!);
    expect(redirectUrl.searchParams.get('next')).toBe('/tracker/deep/nested/path');
  });
});

describe('middleware matcher', () => {
  // Next.js anchors matcher patterns to the full path — wrap with ^ and $ for standalone testing
  const matcherRegex = new RegExp(`^${config.matcher[0]}$`);

  it('matches app routes', () => {
    expect(matcherRegex.test('/tracker')).toBe(true);
    expect(matcherRegex.test('/tracker/settings')).toBe(true);
    expect(matcherRegex.test('/portfolio/projects/123')).toBe(true);
  });

  it('excludes the homepage', () => {
    // The regex requires .+ (at least one char after /), so "/" alone won't match
    expect(matcherRegex.test('/')).toBe(false);
  });

  it('excludes _next paths', () => {
    expect(matcherRegex.test('/_next/static/chunk.js')).toBe(false);
    expect(matcherRegex.test('/_next/data/build-id/page.json')).toBe(false);
  });

  it('excludes api routes', () => {
    expect(matcherRegex.test('/api/health')).toBe(false);
    expect(matcherRegex.test('/api/auth/login')).toBe(false);
  });

  it('excludes static files with extensions', () => {
    expect(matcherRegex.test('/favicon.ico')).toBe(false);
    expect(matcherRegex.test('/rob.png')).toBe(false);
    expect(matcherRegex.test('/manifest.json')).toBe(false);
    expect(matcherRegex.test('/icon-192.svg')).toBe(false);
  });
});
