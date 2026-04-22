import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { App } from '@robscholey/contracts';
import type { SessionContextValue } from '@/contexts/SessionContext';
import { AppSelector } from '@/components/AppSelector';

const mockLogout = vi.fn();

const baseSession: SessionContextValue = {
  sessionToken: 'sess_1',
  jwt: 'jwt',
  user: { id: 'u1', name: 'Rob', type: 'owner', createdAt: '2026-01-01T00:00:00.000Z' },
  apps: [],
  codeExpiresAt: null,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  submitCode: vi.fn(),
  logout: mockLogout,
};

let currentSession: SessionContextValue = baseSession;

vi.mock('@/contexts/SessionContext', () => ({
  useSession: () => currentSession,
}));

const portfolioApp: App = {
  id: 'portfolio',
  name: 'Portfolio',
  url: 'http://localhost:3003',
  iconUrl: '',
  description: 'Narrative site — selected work.',
  active: true,
  defaultTheme: 'dark',
  defaultAccent: 'teal',
  version: '0.3.0',
  lastUpdatedAt: '2026-04-18T00:00:00.000Z',
  statusVariant: 'live',
  visualKey: 'bars',
};

const unknownVisualApp: App = {
  id: 'portfolio',
  name: 'Portfolio',
  url: 'http://localhost:3003',
  iconUrl: '',
  description: 'Narrative site.',
  active: true,
  defaultTheme: 'dark',
  defaultAccent: 'teal',
  statusVariant: 'live',
  visualKey: 'does-not-exist',
};

beforeEach(() => {
  mockLogout.mockReset();
  currentSession = { ...baseSession, apps: [], codeExpiresAt: null };
  // Silence the dev-only warn emitted by the visual registry when it can't
  // resolve a key — it's exercised deliberately by the "unknown visualKey"
  // test and would otherwise spam the test output.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('AppSelector', () => {
  it('renders the intro copy, MetaGrid, and changelog when authenticated', () => {
    currentSession = { ...baseSession, apps: [portfolioApp] };
    render(<AppSelector />);

    expect(screen.getByText('Choose an app.')).toBeDefined();
    expect(screen.getByText('tier')).toBeDefined();
    expect(screen.getByText('code')).toBeDefined();
    expect(screen.getByText('apps')).toBeDefined();
    // Changelog entry surfaced in the "Recent" strip.
    expect(screen.getByText(/Design system page/)).toBeDefined();
  });

  it('renders the placeholder card for the paused Canopy app', () => {
    currentSession = { ...baseSession, apps: [portfolioApp] };
    render(<AppSelector />);
    expect(screen.getByText('Canopy')).toBeDefined();
    expect(screen.getByText('not yet available')).toBeDefined();
  });

  it('labels the tier as "owner" when the user is an owner', () => {
    currentSession = { ...baseSession, apps: [portfolioApp] };
    render(<AppSelector />);
    expect(screen.getByText('owner')).toBeDefined();
  });

  it('labels the tier as "guest" for named users', () => {
    currentSession = {
      ...baseSession,
      user: { id: 'u2', name: 'Eve', type: 'named', createdAt: '2026-01-01T00:00:00.000Z' },
      apps: [portfolioApp],
    };
    render(<AppSelector />);
    expect(screen.getByText('guest')).toBeDefined();
  });

  it('renders "expired" on the code row when the expiry is in the past', () => {
    currentSession = {
      ...baseSession,
      apps: [portfolioApp],
      codeExpiresAt: '2020-01-01T00:00:00.000Z',
    };
    render(<AppSelector />);
    expect(screen.getByText('expired')).toBeDefined();
  });

  it('renders an em-dash when there is no code expiry', () => {
    currentSession = { ...baseSession, apps: [portfolioApp], codeExpiresAt: null };
    render(<AppSelector />);
    expect(screen.getByText('—')).toBeDefined();
  });

  it('invokes logout when the log-out button is clicked', () => {
    currentSession = { ...baseSession, apps: [portfolioApp] };
    render(<AppSelector />);
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('does not crash when an app has an unknown visualKey', () => {
    currentSession = { ...baseSession, apps: [unknownVisualApp] };
    expect(() => render(<AppSelector />)).not.toThrow();
    // The card still renders even without a visual.
    expect(screen.getByText('Portfolio')).toBeDefined();
  });

  it('renders nothing when the user is null', () => {
    currentSession = { ...baseSession, user: null };
    const { container } = render(<AppSelector />);
    expect(container.firstChild).toBeNull();
  });
});
