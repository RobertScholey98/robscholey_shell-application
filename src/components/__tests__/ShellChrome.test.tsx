import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SessionContextValue } from '@/contexts/SessionContext';
import { ShellChrome } from '@/components/ShellChrome';

const mockSession: SessionContextValue = {
  sessionToken: 'sess_1',
  jwt: 'jwt',
  user: null,
  apps: [],
  codeExpiresAt: null,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  submitCode: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/contexts/SessionContext', () => ({
  useSession: () => mockSession,
}));

/** Mutates the mock session so each test can describe its own scenario. */
function setSession(patch: Partial<SessionContextValue>): void {
  Object.assign(mockSession, patch);
}

beforeEach(() => {
  setSession({
    user: null,
    codeExpiresAt: null,
    isAuthenticated: true,
  });
});

describe('ShellChrome', () => {
  it('renders the rs. brand when a user is present', () => {
    setSession({
      user: { id: 'u1', name: 'Rob', type: 'owner', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    render(<ShellChrome />);
    // `rs` + `.` are split across elements for the brand dot colour; read by role.
    const brand = screen.getByRole('link');
    expect(brand.textContent).toBe('rs.');
    expect(brand.getAttribute('href')).toBe('/');
  });

  it('prefixes the pill with "owner" for owner users', () => {
    setSession({
      user: { id: 'u1', name: 'Rob', type: 'owner', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    render(<ShellChrome />);
    expect(screen.getByText('owner · Rob')).toBeDefined();
  });

  it('prefixes the pill with "guest" for named users', () => {
    setSession({
      user: { id: 'u2', name: 'Eve', type: 'named', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    render(<ShellChrome />);
    expect(screen.getByText('guest · Eve')).toBeDefined();
  });

  it('renders a bare "guest" label for anonymous users', () => {
    setSession({
      user: { id: 'u3', name: 'Anon', type: 'anonymous', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    render(<ShellChrome />);
    expect(screen.getByText('guest')).toBeDefined();
  });

  it('renders nothing when no user is present', () => {
    const { container } = render(<ShellChrome />);
    expect(container.firstChild).toBeNull();
  });
});
