import { describe, it, expect } from 'vitest';
import { formatRelative, formatExpiryRemaining } from '@/lib/format';

const NOW = Date.parse('2026-04-20T12:00:00.000Z');

/** Builds an ISO timestamp `deltaMs` relative to the frozen NOW reference. */
function at(deltaMs: number): string {
  return new Date(NOW + deltaMs).toISOString();
}

describe('formatRelative', () => {
  it('renders a past delta in minutes', () => {
    expect(formatRelative(at(-30 * 60 * 1000), NOW)).toBe('30m');
  });

  it('renders a past delta in hours', () => {
    expect(formatRelative(at(-5 * 60 * 60 * 1000), NOW)).toBe('5h');
  });

  it('renders a past delta in days', () => {
    expect(formatRelative(at(-2 * 24 * 60 * 60 * 1000), NOW)).toBe('2d');
  });

  it('renders a past delta in weeks', () => {
    expect(formatRelative(at(-3 * 7 * 24 * 60 * 60 * 1000), NOW)).toBe('3w');
  });

  it('renders a future delta with "in" prefix', () => {
    expect(formatRelative(at(2 * 60 * 60 * 1000), NOW)).toBe('in 2h');
  });

  it('returns empty string for an unparseable timestamp', () => {
    expect(formatRelative('not a date', NOW)).toBe('');
  });
});

describe('formatExpiryRemaining', () => {
  it('renders "Nd left" for a future expiry inside the week window', () => {
    expect(formatExpiryRemaining(at(5 * 24 * 60 * 60 * 1000), NOW)).toBe('5d left');
  });

  it('renders "Nh left" when the code expires today', () => {
    expect(formatExpiryRemaining(at(2 * 60 * 60 * 1000), NOW)).toBe('2h left');
  });

  it('renders "expired" for a past timestamp', () => {
    expect(formatExpiryRemaining(at(-60 * 1000), NOW)).toBe('expired');
  });

  it('renders "expired" for the exact boundary', () => {
    expect(formatExpiryRemaining(at(0), NOW)).toBe('expired');
  });
});
