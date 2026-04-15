import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AppFrame } from './AppFrame';
import type { AppInfo } from '@/lib/types';

const APP_ORIGIN = 'https://tracker.robscholey.com';

const mockApp: AppInfo = {
  id: 'tracker',
  name: 'Tracker',
  url: `${APP_ORIGIN}/`,
  iconUrl: '/icons/tracker.svg',
  description: 'Time tracking app',
  active: true,
};

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockSession = {
  jwt: 'test-jwt-123',
  user: { id: 'user-1', name: 'Rob', type: 'owner' as const },
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
  user: { id: 'user-1', name: 'Rob', type: 'owner' },
  apps: [mockApp],
});

vi.mock('@/lib/authClient', () => ({
  logAccess: (...args: unknown[]) => mockLogAccess(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

/** Simulates a postMessage from the child iframe. */
function dispatchChildMessage(data: Record<string, unknown>, origin = APP_ORIGIN) {
  const event = new MessageEvent('message', { data, origin });
  window.dispatchEvent(event);
}

/** Captures messages posted to the iframe's contentWindow. */
let postedMessages: { message: unknown; origin: string }[] = [];

beforeEach(() => {
  postedMessages = [];
  mockPush.mockClear();
  mockReplace.mockClear();
  mockLogAccess.mockClear();
  mockGetSession.mockClear();
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppFrame', () => {
  it('renders an iframe with the correct src and title', () => {
    const { container } = render(<AppFrame app={mockApp} subPath={null} />);
    const iframe = container.querySelector('iframe');

    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toBe(mockApp.url);
    expect(iframe?.getAttribute('title')).toBe(mockApp.name);
  });

  it('logs access on mount', () => {
    render(<AppFrame app={mockApp} subPath={null} />);

    expect(mockLogAccess).toHaveBeenCalledWith('sess_test-token', 'tracker');
  });

  it('sends shell-context on iframe load', () => {
    const { container } = render(<AppFrame app={mockApp} subPath="settings" />);
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
        isEmbedded: true,
        showBackButton: true,
        shellOrigin: window.location.origin,
        jwt: 'test-jwt-123',
        user: { id: 'user-1', name: 'Rob', type: 'owner' },
        subPath: 'settings',
        theme: 'light',
      },
      APP_ORIGIN,
    );
  });

  it('re-sends shell-context on request-shell-context message', () => {
    const { container } = render(<AppFrame app={mockApp} subPath={null} />);
    const iframe = container.querySelector('iframe')!;

    const mockPostMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    act(() => {
      dispatchChildMessage({ type: 'request-shell-context' });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'shell-context' }),
      APP_ORIGIN,
    );
  });

  it('navigates to home on navigate-to-shell message', () => {
    render(<AppFrame app={mockApp} subPath={null} />);

    act(() => {
      dispatchChildMessage({ type: 'navigate-to-shell' });
    });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('updates browser URL on route-change message', () => {
    render(<AppFrame app={mockApp} subPath={null} />);

    act(() => {
      dispatchChildMessage({ type: 'route-change', path: 'settings/profile' });
    });

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/tracker/settings/profile',
    );
  });

  it('handles route-change with empty path', () => {
    render(<AppFrame app={mockApp} subPath={null} />);

    act(() => {
      dispatchChildMessage({ type: 'route-change', path: '' });
    });

    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/tracker');
  });

  it('sends jwt-refresh on request-jwt-refresh message', async () => {
    const { container } = render(<AppFrame app={mockApp} subPath={null} />);
    const iframe = container.querySelector('iframe')!;

    const mockPostMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    act(() => {
      dispatchChildMessage({ type: 'request-jwt-refresh' });
    });

    // Wait for the async getSession call to resolve
    await vi.waitFor(() => {
      expect(mockGetSession).toHaveBeenCalledWith('sess_test-token');
    });

    await vi.waitFor(() => {
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: 'jwt-refresh', jwt: 'refreshed-jwt' },
        APP_ORIGIN,
      );
    });
  });

  it('ignores messages from wrong origins', () => {
    render(<AppFrame app={mockApp} subPath={null} />);

    act(() => {
      dispatchChildMessage({ type: 'navigate-to-shell' }, 'https://evil.com');
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('ignores messages without a string type field', () => {
    render(<AppFrame app={mockApp} subPath={null} />);

    act(() => {
      dispatchChildMessage({ notAType: 123 });
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
