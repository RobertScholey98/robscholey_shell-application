import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * `authUrl` is evaluated at module load, so each scenario needs a fresh
 * module instance via `vi.resetModules()` + a dynamic import.
 */
async function loadAuthUrl(env: Record<string, string | undefined>): Promise<string> {
  vi.resetModules();
  const original: Record<string, string | undefined> = {
    AUTH_URL: process.env.AUTH_URL,
    NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  };
  try {
    for (const key of Object.keys(env)) {
      if (env[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = env[key];
      }
    }
    const mod = (await import('./config')) as { authUrl: string };
    return mod.authUrl;
  } finally {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

async function expectLoadThrows(env: Record<string, string | undefined>): Promise<Error> {
  try {
    await loadAuthUrl(env);
  } catch (err) {
    return err as Error;
  }
  throw new Error('expected module load to throw');
}

afterEach(() => {
  vi.resetModules();
});

// vitest's jsdom environment defines `window`, so the module takes the browser
// branch and reads NEXT_PUBLIC_AUTH_URL. Tests drive that variable directly.
describe('config.authUrl', () => {
  it('falls back to localhost when NEXT_PUBLIC_AUTH_URL is unset', async () => {
    const url = await loadAuthUrl({ AUTH_URL: undefined, NEXT_PUBLIC_AUTH_URL: undefined });
    expect(url).toBe('http://localhost:3001');
  });

  it('uses NEXT_PUBLIC_AUTH_URL when set', async () => {
    const url = await loadAuthUrl({
      AUTH_URL: undefined,
      NEXT_PUBLIC_AUTH_URL: 'https://auth.example.com',
    });
    expect(url).toBe('https://auth.example.com');
  });

  it('strips path, query, and hash down to the origin', async () => {
    const url = await loadAuthUrl({
      AUTH_URL: undefined,
      NEXT_PUBLIC_AUTH_URL: 'https://auth.example.com/api/v1?x=1#frag',
    });
    expect(url).toBe('https://auth.example.com');
  });

  it('throws at module load on a malformed URL', async () => {
    const err = await expectLoadThrows({
      AUTH_URL: undefined,
      NEXT_PUBLIC_AUTH_URL: 'not a url',
    });
    expect(err.message).toContain('Invalid base URL');
    expect(err.message).toContain('not a url');
  });
});
