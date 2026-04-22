'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Accent, ShellTheme } from '@robscholey/shell-kit';

/** Per-iframe page-level theme + accent declared by an embedded sub-app. */
export interface PageThemeState {
  /** The theme the iframe's currently-mounted `<PageTheme>` declared, or `null` for "no override". */
  theme: ShellTheme | null;
  /** The accent the iframe's currently-mounted `<PageTheme>` declared, or `null` for "no override". */
  accent: Accent | null;
}

interface PageThemeRegistryValue {
  /** Map of `appId` → the most recent `page-theme` declaration that iframe sent. */
  states: Map<string, PageThemeState>;
  /** Records a new declaration for `appId`. Called by `AppFrame` on every `page-theme` message. */
  record: (appId: string, state: PageThemeState) => void;
}

const PageThemeRegistryContext = createContext<PageThemeRegistryValue | null>(null);

/** Props for the {@link PageThemeRegistryProvider}. */
export interface PageThemeRegistryProviderProps {
  children: ReactNode;
}

/**
 * Holds the most recent page-level theme + accent that each embedded
 * iframe has declared via the `page-theme` message protocol. Future
 * cross-cutting shell chrome (chat bubble, messaging surfaces) reads from
 * here so it can render in the same visual language as whichever iframe
 * the user is currently looking at.
 *
 * Mounted once near the top of the shell tree (under `Providers`), so the
 * map's identity is stable across navigations within a sub-app — the
 * iframe stays mounted on internal navigation, so its `page-theme`
 * declarations all land in the same map entry.
 */
export function PageThemeRegistryProvider({ children }: PageThemeRegistryProviderProps) {
  // The map identity itself doesn't change; we wrap state mutations in a
  // setState pulse so any consumer reading via useContext re-renders when
  // an entry lands. Using a Map (rather than a plain object) keeps the API
  // explicit about iteration semantics for callers that want to enumerate.
  const [states] = useState<Map<string, PageThemeState>>(() => new Map());
  const [, bumpVersion] = useState(0);

  const record = useCallback(
    (appId: string, state: PageThemeState) => {
      const prev = states.get(appId);
      if (prev && prev.theme === state.theme && prev.accent === state.accent) return;
      states.set(appId, state);
      bumpVersion((v) => v + 1);
    },
    [states],
  );

  const value = useMemo<PageThemeRegistryValue>(() => ({ states, record }), [states, record]);

  return (
    <PageThemeRegistryContext.Provider value={value}>{children}</PageThemeRegistryContext.Provider>
  );
}

/**
 * Returns the page-theme map. Future chrome (chat bubble, etc.) can call
 * this to look up the active iframe's accent and render to match. Throws
 * when called outside the provider so misuse fails fast at boot.
 */
export function usePageThemeRegistry(): PageThemeRegistryValue {
  const ctx = useContext(PageThemeRegistryContext);
  if (ctx === null) {
    throw new Error(
      'usePageThemeRegistry must be used within a PageThemeRegistryProvider',
    );
  }
  return ctx;
}
