import type { NextConfig } from 'next';

/**
 * Derives the allowed frame-src / connect-src directives from the shell's
 * own origin. In dev (localhost) we open up `http://localhost:*` so any
 * sub-app port can be embedded and talk to auth; in prod we lock down to
 * `https://*.{publicDomain}` so only robscholey.com sub-apps can load.
 *
 * Keyed off `NEXT_PUBLIC_SHELL_ORIGIN` / `NEXT_PUBLIC_AUTH_URL` — both are
 * baked into the build, so the policy matches whatever environment the
 * image was built for.
 */
function buildCspHeader(): string {
  const shellOrigin = process.env.NEXT_PUBLIC_SHELL_ORIGIN ?? 'http://localhost:3000';
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001';

  let shellHost: URL;
  let authHost: URL;
  try {
    shellHost = new URL(shellOrigin);
    authHost = new URL(authUrl);
  } catch {
    // Fallback to localhost-only if the env is malformed at build time.
    shellHost = new URL('http://localhost:3000');
    authHost = new URL('http://localhost:3001');
  }

  const isDev = shellHost.hostname === 'localhost' || shellHost.hostname === '127.0.0.1';
  const frameSrc = isDev ? "http://localhost:*" : `https://*.${shellHost.hostname}`;
  const connectSrc = `'self' ${authHost.origin}`;

  // Next.js App Router injects inline bootstrap scripts + runtime style tags;
  // `'unsafe-inline'` is required until Next ships per-request nonces on
  // every surface (it still doesn't, as of Next 16). Dev also needs
  // `'unsafe-eval'` for HMR.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@robscholey/shell-kit'],
  allowedDevOrigins: ['192.168.1.198'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: buildCspHeader() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
