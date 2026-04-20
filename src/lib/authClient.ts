import { createAuthClient } from '@robscholey/contracts';
import type { AuthClient } from '@robscholey/contracts';

/**
 * Resolves the auth service base URL for the current runtime.
 *
 * In the browser the baked-in `NEXT_PUBLIC_AUTH_URL` (e.g. `http://localhost:3001`)
 * works because it's reachable via the host port mapping. On the server the shell
 * runs inside its own container, so `localhost:3001` is the container itself —
 * container-to-container traffic has to go through the Docker service name.
 *
 * `AUTH_URL` (non-public) overrides the server-side value when set, defaulting
 * to `NEXT_PUBLIC_AUTH_URL` for host dev where both sides reach the same port.
 */
function getAuthUrl(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.AUTH_URL || process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001'
    );
  }
  return process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
}

/**
 * Shared {@link AuthClient} bound to the runtime-resolved auth service URL.
 * Endpoints exposed on `authClient.auth` and `authClient.public` do not require
 * a Bearer token — session identity is carried in the request body (logout,
 * logAccess) or query string (getSession).
 */
export const authClient: AuthClient = createAuthClient({ baseUrl: getAuthUrl() });

export { AuthClientError } from '@robscholey/contracts';
