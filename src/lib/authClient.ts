import { createAuthClient } from '@robscholey/contracts';
import type { AuthClient } from '@robscholey/contracts';
import { authUrl } from '@/lib/config';

/**
 * Shared {@link AuthClient} bound to the runtime-resolved auth service URL.
 * Endpoints exposed on `authClient.auth` and `authClient.public` do not require
 * a Bearer token — session identity is carried in the request body (logout,
 * logAccess) or query string (getSession).
 */
export const authClient: AuthClient = createAuthClient({ baseUrl: authUrl });

export { AuthClientError } from '@robscholey/contracts';
