/**
 * Parses an env var as an origin-only URL. Throws at module load if the value
 * is set but malformed — fail-fast misconfiguration beats the silent `||
 * 'http://localhost:3001'` fallback the app used to carry, where a typo in
 * `NEXT_PUBLIC_AUTH_URL` would only reveal itself as confusing 4xx/CORS
 * errors in the browser.
 *
 * @param raw - The env var's current value (may be undefined).
 * @param fallback - Value to use when `raw` is undefined (dev default).
 * @returns The parsed URL's origin (e.g. `http://localhost:3001`).
 */
function parseBaseUrl(raw: string | undefined, fallback: string): string {
  const value = raw ?? fallback;
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`Invalid base URL: ${value}`);
  }
}

/**
 * Auth service base URL for the current runtime.
 *
 * In the browser the baked-in `NEXT_PUBLIC_AUTH_URL` (e.g. `http://localhost:3001`)
 * works because it's reachable via the host port mapping. On the server the shell
 * runs inside its own container, so `localhost:3001` is the container itself —
 * container-to-container traffic has to go through the Docker service name.
 *
 * `AUTH_URL` (non-public) overrides the server-side value when set, defaulting
 * to `NEXT_PUBLIC_AUTH_URL` for host dev where both sides reach the same port.
 */
export const authUrl: string = parseBaseUrl(
  typeof window === 'undefined'
    ? (process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_AUTH_URL)
    : process.env.NEXT_PUBLIC_AUTH_URL,
  'http://localhost:3001',
);
