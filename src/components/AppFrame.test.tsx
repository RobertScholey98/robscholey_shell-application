import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, renderHook } from '@testing-library/react';
import { ShellKitProvider } from '@robscholey/shell-kit';
import { AppFrame } from './AppFrame';
import {
  PageThemeRegistryProvider,
  usePageThemeRegistry,
} from '@/contexts/PageThemeContext';
import type { App } from '@robscholey/contracts';
import type { ReactNode } from 'react';

const APP_ORIGIN = 'https://tracker.robscholey.com';

const mockApp: App = {
  id: 'tracker',
  name: 'Tracker',
  url: `${APP_ORIGIN}/`,
  iconUrl: '/icons/tracker.svg',
  description: 'Time tracking app',
  active: true,
  defaultTheme: 'dark',
  defaultAccent: 'teal',
};

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockSession = {
  jwt: 'test-jwt-123',
  user: {
    id: 'user-1',
    name: 'Rob',
    type: 'owner' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  sessionToken: 'sess_test-token',
  apps: [mockApp],
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  submitCode: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/contexts/SessionContext', () => ({
  useSession: () => mockSession,
}));

const mockLogAccess = vi.fn().mockResolvedValue(undefined);
const mockGetSession = vi.fn().mockResolvedValue({
  sessionToken: 'sess_test-token',
  jwt: 'refreshed-jwt',
  user: { id: 'user-1', name: 'Rob', type: 'owner', createdAt: '2026-01-01T00:00:00.000Z' },
  apps: [mockApp],
});

vi.mock('@/lib/authClient', () => ({
  authClient: {
    auth: {
      logAccess: (...args: unknown[]) => mockLogAccess(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

/** Simulates a postMessage from the child iframe. */
function dispatchChildMessage(data: Record<string, unknown>, origin = APP_ORIGIN) {
  const event = new MessageEvent('message', { data, origin });
  window.dispatchEvent(event);
}

/**
 * AppFrame depends on the PageThemeRegistry (records page-theme messages
 * per iframe) and the ShellKitProvider (origin sanity check + future hooks).
 * Both providers wrap every test render so message-handling effects can
 * resolve their dependencies.
 */
function renderAppFrame(props: Parameters<typeof AppFrame>[0]) {
  return render(
    <ShellKitProvider config={{ shellOrigin: window.location.origin }}>
      <PageThemeRegistryProvider>
        <AppFrame {...props} />
      </PageThemeRegistryProvider>
    </ShellKitProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockLogAccess.mockClear();
  mockGetSession.mockClear();
  vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppFrame', () => {
  it('renders an iframe with the correct src and title', () => {
    const { container } = renderAppFrame({ app: mockApp, subPath: null });
    const iframe = container.querySelector('iframe');

    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toBe(mockApp.url);
    expect(iframe?.getAttribute('title')).toBe(mockApp.name);
  });

  it('logs access on mount', () => {
    renderAppFrame({ app: mockApp, subPath: null });

    expect(mockLogAccess).toHaveBeenCalledWith({
      sessionToken: 'sess_test-token',
      appId: 'tracker',
    });
  });

  it('sends shell-context on iframe load — identity only, no theme/accent', () => {
    const { container } = renderAppFrame({ app: mockApp, subPath: 'settings' });
    const iframe = container.querySelector('iframe')!;

    // Mock the contentWindow.postMessage
    const mockPostMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    // Fire the load event
    act(() => {
      iframe.dispatchEvent(new Event('load'));
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      {
        type: 'shell-context',
        protocolVersion: 2,
        isEmbedded: true,
        showBackButton: true,
        shellOrigin: window.location.origin,
        jwt: 'test-jwt-123',
        user: { id: 'user-1', name: 'Rob', type: 'owner' },
        subPath: 'settings',
      },
      APP_ORIGIN,
    );
  });

  it('re-sends shell-context on request-shell-context message', () => {
    const { container } = renderAppFrame({ app: mockApp, subPath: null });
    const iframe = container.querySelector('iframe')!;

    const mockPostMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    act(() => {
      dispatchChildMessage({ type: 'request-shell-context', protocolVersion: 2 });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'shell-context' }),
      APP_ORIGIN,
    );
  });

  it('navigates to home on navigate-to-shell message', () => {
    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      dispatchChildMessage({ type: 'navigate-to-shell', protocolVersion: 2 });
    });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('pushes browser history on route-change message', () => {
    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      dispatchChildMessage({
        type: 'route-change',
        protocolVersion: 2,
        path: 'settings/profile',
      });
    });

    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      '',
      '/tracker/settings/profile',
    );
  });

  it('strips leading slash from route-change path', () => {
    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      dispatchChildMessage({ type: 'route-change', protocolVersion: 2, path: '/example' });
    });

    expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/tracker/example');
  });

  it('handles route-change with empty path', () => {
    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      dispatchChildMessage({ type: 'route-change', protocolVersion: 2, path: '' });
    });

    expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/tracker');
  });

  it('skips pushState when route-change path matches current pathname', () => {
    // Simulate current pathname already being /tracker/settings
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/tracker/settings' },
      writable: true,
      configurable: true,
    });

    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      dispatchChildMessage({ type: 'route-change', protocolVersion: 2, path: 'settings' });
    });

    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it('sends jwt-refresh on request-jwt-refresh message', async () => {
    const { container } = renderAppFrame({ app: mockApp, subPath: null });
    const iframe = container.querySelector('iframe')!;

    const mockPostMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    act(() => {
      dispatchChildMessage({ type: 'request-jwt-refresh', protocolVersion: 2 });
    });

    // Wait for the async getSession call to resolve
    await vi.waitFor(() => {
      expect(mockGetSession).toHaveBeenCalledWith('sess_test-token');
    });

    await vi.waitFor(() => {
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: 'jwt-refresh', protocolVersion: 2, jwt: 'refreshed-jwt' },
        APP_ORIGIN,
      );
    });
  });

  it('ignores messages from wrong origins', () => {
    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      dispatchChildMessage(
        { type: 'navigate-to-shell', protocolVersion: 2 },
        'https://evil.com',
      );
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('ignores messages without a string type field', () => {
    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      dispatchChildMessage({ notAType: 123 });
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('ignores messages with a mismatched protocolVersion', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      // v1 — pre-Phase-I peer trying to talk to a v2 shell
      dispatchChildMessage({ type: 'navigate-to-shell', protocolVersion: 1 });
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0] ?? '')).toContain('protocol mismatch');
  });

  it('ignores structurally malformed messages', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderAppFrame({ app: mockApp, subPath: null });

    act(() => {
      // route-change without a path
      dispatchChildMessage({ type: 'route-change', protocolVersion: 2 });
    });

    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('sends navigate-to-path to iframe on popstate with sub-path', () => {
    const { container } = renderAppFrame({ app: mockApp, subPath: null });
    const iframe = container.querySelector('iframe')!;

    const mockPostMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    // Simulate browser back/forward to /tracker/settings/profile
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/tracker/settings/profile' },
      writable: true,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      { type: 'navigate-to-path', protocolVersion: 2, path: 'settings/profile' },
      APP_ORIGIN,
    );
  });

  it('sends navigate-to-path with empty path when at app root', () => {
    const { container } = renderAppFrame({ app: mockApp, subPath: null });
    const iframe = container.querySelector('iframe')!;

    const mockPostMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/tracker' },
      writable: true,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      { type: 'navigate-to-path', protocolVersion: 2, path: '' },
      APP_ORIGIN,
    );
  });

  it('records page-theme declarations into the registry per iframe', () => {
    function Composed() {
      const registry = usePageThemeRegistry();
      return (
        <PageThemeRegistryProvider>
          <AppFrame app={mockApp} subPath={null} />
          <span data-testid="snapshot">
            {registry.states.get(mockApp.id)?.accent ?? 'none'}
          </span>
        </PageThemeRegistryProvider>
      );
    }

    // Drive the registry directly via the provider so the test owns the
    // shared map identity and can read it back through a hook after the
    // child posts page-theme. Using renderHook here keeps the assertion
    // pointed at the registry value rather than a rendered span.
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ShellKitProvider config={{ shellOrigin: window.location.origin }}>
        <PageThemeRegistryProvider>
          <AppFrame app={mockApp} subPath={null} />
          {children}
        </PageThemeRegistryProvider>
      </ShellKitProvider>
    );

    const { result } = renderHook(() => usePageThemeRegistry(), { wrapper });

    act(() => {
      dispatchChildMessage({
        type: 'page-theme',
        protocolVersion: 2,
        theme: 'dark',
        accent: 'betway',
      });
    });

    expect(result.current.states.get(mockApp.id)).toEqual({
      theme: 'dark',
      accent: 'betway',
    });

    // A subsequent declaration overwrites the previous one (latest wins).
    act(() => {
      dispatchChildMessage({
        type: 'page-theme',
        protocolVersion: 2,
        theme: null,
        accent: 'fsgb',
      });
    });

    expect(result.current.states.get(mockApp.id)).toEqual({
      theme: null,
      accent: 'fsgb',
    });

    // Reference Composed so eslint doesn't flag the unused inline component.
    void Composed;
  });
});
