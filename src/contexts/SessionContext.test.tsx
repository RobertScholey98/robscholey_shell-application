import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext';
import type { AuthResponse, SessionResponse } from '@robscholey/contracts';

const mockLogin = vi.fn();
const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockGetSession = vi.fn();

vi.mock('@/lib/authClient', () => ({
  authClient: {
    auth: {
      login: (...args: unknown[]) => mockLogin(...args),
      logout: (...args: unknown[]) => mockLogout(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

/**
 * Builds a JWT whose `exp` claim is `expiresInMs` from now. The signature is
 * irrelevant — SessionContext only decodes the payload.
 */
function makeJwt(expiresInMs: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor((Date.now() + expiresInMs) / 1000) }),
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

const owner = {
  id: 'user-1',
  name: 'Rob',
  type: 'owner' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const authResponse: AuthResponse = {
  sessionToken: 'sess_test',
  jwt: makeJwt(60 * 60 * 1000),
  user: owner,
  apps: [],
};

/** Test consumer that renders session state and exposes the login/logout methods. */
function Consumer() {
  const { isAuthenticated, isLoading, user, login, logout } = useSession();
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="loading">{isLoading ? 'yes' : 'no'}</span>
      <span data-testid="user">{user?.name ?? 'none'}</span>
      <button type="button" onClick={() => login('rob', 'pw')}>
        login
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
}

beforeEach(() => {
  mockLogin.mockReset();
  mockLogout.mockClear();
  mockGetSession.mockReset();
  document.cookie = 'rs_session=; Path=/; Max-Age=0';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SessionProvider', () => {
  it('hydrates from initialSession without calling getSession', () => {
    const initial: SessionResponse = {
      sessionToken: 'sess_initial',
      jwt: makeJwt(60 * 60 * 1000),
      user: owner,
      apps: [],
    };

    render(
      <SessionProvider initialSession={initial}>
        <Consumer />
      </SessionProvider>,
    );

    expect(screen.getByTestId('auth').textContent).toBe('yes');
    expect(screen.getByTestId('user').textContent).toBe('Rob');
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('logout called mid-bootstrap does not re-hydrate when getSession finally resolves', async () => {
    // Seed a session cookie so the mount-time effect fires getSession.
    document.cookie = 'rs_session=sess_cookie; Path=/';

    let resolveGetSession: (value: SessionResponse) => void = () => {};
    mockGetSession.mockReturnValueOnce(
      new Promise<SessionResponse>((resolve) => {
        resolveGetSession = resolve;
      }),
    );

    render(
      <SessionProvider initialSession={null}>
        <Consumer />
      </SessionProvider>,
    );

    // Log out before the pending getSession resolves. Without the generation
    // counter the `.then` branch would stomp the cleared state back with the
    // stale response.
    await act(async () => {
      screen.getByText('logout').click();
    });

    await act(async () => {
      resolveGetSession({
        sessionToken: 'sess_cookie',
        jwt: makeJwt(60 * 60 * 1000),
        user: owner,
        apps: [],
      });
    });

    expect(screen.getByTestId('auth').textContent).toBe('no');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('hydrates from a session cookie on hard refresh and clears the loading flag', async () => {
    // Simulates a hard-reload mid-session: the cookie survives but the
    // in-memory JWT is gone. SessionProvider should pick up the cookie,
    // fetch a fresh session, and land on authenticated + !isLoading.
    document.cookie = 'rs_session=sess_cookie; Path=/';

    const session: SessionResponse = {
      sessionToken: 'sess_cookie',
      jwt: makeJwt(60 * 60 * 1000),
      user: owner,
      apps: [],
    };

    let resolvePromise!: (value: SessionResponse) => void;
    mockGetSession.mockReturnValueOnce(
      new Promise<SessionResponse>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    render(
      <SessionProvider initialSession={null}>
        <Consumer />
      </SessionProvider>,
    );

    // Loading flag is set while the mount-time getSession is in flight.
    expect(screen.getByTestId('loading').textContent).toBe('yes');
    expect(screen.getByTestId('auth').textContent).toBe('no');

    await act(async () => {
      resolvePromise(session);
    });

    // waitFor lets the .then + .finally chain flush through to React state.
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no');
    });
    expect(screen.getByTestId('auth').textContent).toBe('yes');
    expect(screen.getByTestId('user').textContent).toBe('Rob');
    expect(mockGetSession).toHaveBeenCalledWith('sess_cookie');
  });

  it('clears the loading flag and drops the cookie when hard-refresh getSession fails', async () => {
    document.cookie = 'rs_session=sess_stale; Path=/';
    mockGetSession.mockRejectedValueOnce(new Error('401'));

    render(
      <SessionProvider initialSession={null}>
        <Consumer />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no');
    });
    expect(screen.getByTestId('auth').textContent).toBe('no');
    expect(document.cookie).not.toContain('sess_stale');
  });

  it('login applies the auth response and marks the user authenticated', async () => {
    mockLogin.mockResolvedValueOnce(authResponse);

    render(
      <SessionProvider initialSession={null}>
        <Consumer />
      </SessionProvider>,
    );

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(screen.getByTestId('auth').textContent).toBe('yes');
    expect(screen.getByTestId('user').textContent).toBe('Rob');
  });
});
