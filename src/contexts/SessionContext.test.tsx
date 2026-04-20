import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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
  const { isAuthenticated, user, login, logout } = useSession();
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
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
