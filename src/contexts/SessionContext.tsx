'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/authClient';
import type {
  App,
  AuthResponse,
  RequiresPasswordResponse,
  SessionResponse,
  User,
} from '@robscholey/contracts';

const COOKIE_NAME = 'rs_session';
const JWT_REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry
// Mirrors the auth service's session lifetime so the cookie expires with the
// server-side record; sent as Max-Age in days to match setCookie's contract.
const SESSION_COOKIE_MAX_AGE_DAYS = 90;

// --- Cookie helpers ---

/** Reads a cookie value by name. */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Sets a cookie with appropriate flags. */
function setCookie(name: string, value: string, maxAgeDays: number): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAgeDays * 86400}${secure}`;
}

/** Deletes a cookie by setting its max-age to 0. */
function deleteCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0`;
}

// --- JWT helpers ---

/** Parses the expiry timestamp from a JWT without verifying the signature. */
function getJwtExpiry(jwt: string): number | null {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// --- Context ---

/** The session state and methods exposed by the SessionContext. */
export interface SessionContextValue {
  /** The current session token, or null if not authenticated. */
  sessionToken: string | null;
  /** The current JWT, or null if not authenticated. */
  jwt: string | null;
  /** The authenticated user, or null. */
  user: User | null;
  /** The apps the current session has access to. */
  apps: App[];
  /** Whether the initial session validation is in progress. */
  isLoading: boolean;
  /** Whether the user is authenticated (has a valid session). */
  isAuthenticated: boolean;
  /** Logs in as the owner with username and password. */
  login: (username: string, password: string) => Promise<void>;
  /** Submits an access code. Returns `{ requiresPassword: true }` if a password is needed. */
  submitCode: (code: string, password?: string) => Promise<RequiresPasswordResponse | void>;
  /** Logs out and clears the session. */
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Hook to access the session context. Throws if used outside a SessionProvider. */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}

/** Props for the {@link SessionProvider} component. */
export interface SessionProviderProps {
  children: ReactNode;
  /**
   * Pre-resolved session from the server, used to avoid the client-side
   * auth flash. When present, initial state hydrates from it and the
   * mount-time fetch is skipped (only the JWT refresh timer is set).
   */
  initialSession?: SessionResponse | null;
}

/** Provides session state and auth methods to the component tree. */
export function SessionProvider({ children, initialSession }: SessionProviderProps) {
  const [sessionToken, setSessionToken] = useState<string | null>(
    initialSession?.sessionToken ?? null,
  );
  const [jwt, setJwt] = useState<string | null>(initialSession?.jwt ?? null);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [apps, setApps] = useState<App[]>(initialSession?.apps ?? []);
  const [isLoading, setIsLoading] = useState(!initialSession);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic counter bumped whenever an in-flight refresh should be treated as
  // stale (logout, a newer refresh, or provider unmount). The async callback
  // captures its generation at schedule time and bails if the ref has moved on,
  // so a slow getSession can't re-hydrate state after logout.
  const refreshGenerationRef = useRef(0);

  /** Schedules a JWT refresh before the token expires. */
  const scheduleRefresh = useCallback((token: string, jwtValue: string) => {
    const generation = ++refreshGenerationRef.current;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const expiry = getJwtExpiry(jwtValue);
    if (!expiry) return;

    const delay = Math.max(0, expiry - Date.now() - JWT_REFRESH_MARGIN_MS);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const session = await authClient.auth.getSession(token);
        if (refreshGenerationRef.current !== generation) return;
        setJwt(session.jwt);
        setUser(session.user);
        setApps(session.apps);
        // Recursive self-schedule chains successive refreshes off each new JWT's
        // expiry. The lint rule flags the forward reference to the local itself;
        // there is no non-recursive equivalent that keeps the timer chain honest.
        // eslint-disable-next-line react-hooks/immutability
        scheduleRefresh(token, session.jwt);
      } catch {
        if (refreshGenerationRef.current !== generation) return;
        // Session expired or invalid — clear everything
        setSessionToken(null);
        setJwt(null);
        setUser(null);
        setApps([]);
        deleteCookie(COOKIE_NAME);
      }
    }, delay);
  }, []);

  /** Sets all session state from an auth response and persists the token. */
  const applyAuthResponse = useCallback(
    (response: AuthResponse) => {
      setSessionToken(response.sessionToken);
      setJwt(response.jwt);
      setUser(response.user);
      setApps(response.apps);
      setCookie(COOKIE_NAME, response.sessionToken, SESSION_COOKIE_MAX_AGE_DAYS);
      scheduleRefresh(response.sessionToken, response.jwt);
    },
    [scheduleRefresh],
  );

  // Validate session on mount (skipped when the server already resolved it)
  useEffect(() => {
    // Capture the ref objects locally so the cleanup never reads `.current`
    // after React has potentially swapped the underlying object. The values
    // we actually mutate/inspect via these refs happen at call time.
    const generationRef = refreshGenerationRef;
    const timerRef = refreshTimerRef;

    if (initialSession) {
      // Already hydrated from SSR — just arm the refresh timer and move on.
      scheduleRefresh(initialSession.sessionToken, initialSession.jwt);
      return () => {
        generationRef.current++;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }

    const token = getCookie(COOKIE_NAME);

    if (!token) {
      // TODO(phase-b): fold initial-load state into a non-effect path during SessionContext rewrite.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }

    const generation = ++generationRef.current;

    authClient.auth
      .getSession(token)
      .then((session) => {
        if (generationRef.current !== generation) return;
        setSessionToken(session.sessionToken);
        setJwt(session.jwt);
        setUser(session.user);
        setApps(session.apps);
        scheduleRefresh(session.sessionToken, session.jwt);
      })
      .catch(() => {
        if (generationRef.current !== generation) return;
        deleteCookie(COOKIE_NAME);
      })
      .finally(() => {
        if (generationRef.current !== generation) return;
        setIsLoading(false);
      });

    return () => {
      generationRef.current++;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [initialSession, scheduleRefresh]);

  /**
   * Logs in as the owner with username and password.
   * @param username - The owner's username.
   * @param password - The owner's password.
   */
  const login = useCallback(
    async (username: string, password: string) => {
      const response = await authClient.auth.login({ username, password });
      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  /**
   * Submits an access code for validation.
   * @param code - The access code string.
   * @param password - Optional password for private codes.
   * @returns `{ requiresPassword: true }` if the code needs a password, `void` on success.
   */
  const submitCode = useCallback(
    async (code: string, password?: string): Promise<RequiresPasswordResponse | void> => {
      const response = await authClient.auth.validateCode({
        code,
        ...(password !== undefined && { password }),
      });
      if ('requiresPassword' in response) {
        return response;
      }
      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  /** Logs out the current session. Clears the cookie, JWT, user, and apps state. */
  const logout = useCallback(async () => {
    // Invalidate any in-flight refresh/bootstrap before we await the server —
    // without this bump a slow getSession resolving after logout would stomp
    // the cleared state below and leave the UI re-authenticated.
    refreshGenerationRef.current++;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    if (sessionToken) {
      try {
        await authClient.auth.logout({ sessionToken });
      } catch {
        // Ignore — server-side cleanup is best-effort
      }
    }
    setSessionToken(null);
    setJwt(null);
    setUser(null);
    setApps([]);
    deleteCookie(COOKIE_NAME);
  }, [sessionToken]);

  const isAuthenticated = sessionToken !== null && user !== null;

  const value = useMemo<SessionContextValue>(
    () => ({
      sessionToken,
      jwt,
      user,
      apps,
      isLoading,
      isAuthenticated,
      login,
      submitCode,
      logout,
    }),
    [sessionToken, jwt, user, apps, isLoading, isAuthenticated, login, submitCode, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
