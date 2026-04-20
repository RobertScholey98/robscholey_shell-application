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

  /** Schedules a JWT refresh before the token expires. */
  const scheduleRefresh = useCallback((token: string, jwtValue: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const expiry = getJwtExpiry(jwtValue);
    if (!expiry) return;

    const delay = Math.max(0, expiry - Date.now() - JWT_REFRESH_MARGIN_MS);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const session = await authClient.auth.getSession(token);
        setJwt(session.jwt);
        setUser(session.user);
        setApps(session.apps);
        // TODO(phase-b): generation-counter rewrite will restructure the recursive self-schedule.
        // eslint-disable-next-line react-hooks/immutability
        scheduleRefresh(token, session.jwt);
      } catch {
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
      setCookie(COOKIE_NAME, response.sessionToken, 90);
      scheduleRefresh(response.sessionToken, response.jwt);
    },
    [scheduleRefresh],
  );

  // Validate session on mount (skipped when the server already resolved it)
  useEffect(() => {
    if (initialSession) {
      // Already hydrated from SSR — just arm the refresh timer and move on.
      scheduleRefresh(initialSession.sessionToken, initialSession.jwt);
      return () => {
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
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

    authClient.auth
      .getSession(token)
      .then((session) => {
        setSessionToken(session.sessionToken);
        setJwt(session.jwt);
        setUser(session.user);
        setApps(session.apps);
        scheduleRefresh(session.sessionToken, session.jwt);
      })
      .catch(() => {
        deleteCookie(COOKIE_NAME);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
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
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
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
