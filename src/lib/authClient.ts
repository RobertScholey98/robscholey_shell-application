import type {
  AuthResponse,
  RequiresPasswordResponse,
  SessionResponse,
  AppMeta,
  ErrorResponse,
} from './types';

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
 * Builds a full auth service URL from a path.
 * @param path - The API path, e.g. `/auth/login`.
 * @returns The full URL including the auth service base.
 */
function url(path: string): string {
  return `${getAuthUrl()}/api${path}`;
}

/**
 * Makes a JSON POST request to the auth service.
 * @param path - The API path.
 * @param body - The JSON request body.
 * @returns The parsed JSON response.
 * @throws {AuthClientError} If the response is not ok.
 */
async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new AuthClientError((data as ErrorResponse).error || 'Request failed', res.status);
  }

  return data as T;
}

/**
 * Makes a GET request to the auth service.
 * @param path - The API path including query string.
 * @returns The parsed JSON response.
 * @throws {AuthClientError} If the response is not ok.
 */
async function get<T>(path: string): Promise<T> {
  const res = await fetch(url(path));

  const data = await res.json();

  if (!res.ok) {
    throw new AuthClientError((data as ErrorResponse).error || 'Request failed', res.status);
  }

  return data as T;
}

/** Error thrown by auth client methods. Includes the HTTP status code. */
export class AuthClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthClientError';
  }
}

/**
 * Validates an access code. Returns an auth response on success, or `{ requiresPassword: true }`
 * if the code is private and no password was provided.
 * @param code - The access code string.
 * @param password - Optional password for private codes.
 * @returns The auth response or a password-required signal.
 */
export async function validateCode(
  code: string,
  password?: string,
): Promise<AuthResponse | RequiresPasswordResponse> {
  return post<AuthResponse | RequiresPasswordResponse>('/auth/validate-code', {
    code,
    ...(password && { password }),
  });
}

/**
 * Logs in as the owner with username and password.
 * @param username - The owner's username.
 * @param password - The owner's password.
 * @returns The auth response with session token, JWT, user, and apps.
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', { username, password });
}

/**
 * Validates a session token and returns a fresh JWT + apps.
 * @param token - The opaque session token from the cookie.
 * @returns The session response with a fresh JWT.
 */
export async function getSession(token: string): Promise<SessionResponse> {
  return get<SessionResponse>(`/auth/session?token=${encodeURIComponent(token)}`);
}

/**
 * Invalidates a session.
 * @param sessionToken - The session token to invalidate.
 */
export async function logout(sessionToken: string): Promise<void> {
  await post('/auth/logout', { sessionToken });
}

/**
 * Logs an app access event. Called by the shell when an iframe loads.
 * @param sessionToken - The current session token.
 * @param appId - The app slug being accessed.
 */
export async function logAccess(sessionToken: string, appId: string): Promise<void> {
  await post('/log-access', { sessionToken, appId });
}

/**
 * Fetches public metadata for an app by slug.
 * @param slug - The app slug (e.g. `"portfolio"`).
 * @returns The app metadata, or `null` if not found.
 */
export async function getAppMeta(slug: string): Promise<AppMeta | null> {
  try {
    return await get<AppMeta>(`/apps/${encodeURIComponent(slug)}/meta`);
  } catch (e) {
    if (e instanceof AuthClientError && e.status === 404) {
      return null;
    }
    throw e;
  }
}
