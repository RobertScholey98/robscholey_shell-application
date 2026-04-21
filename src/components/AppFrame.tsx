'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  PROTOCOL_VERSION,
  parseChildMessage,
  useAccent,
  useTheme,
  type AccentUpdateMessage,
  type JWTRefreshMessage,
  type NavigateToPathMessage,
  type ShellContextMessage,
  type ShellTheme,
  type Accent,
  type ThemeUpdateMessage,
} from '@robscholey/shell-kit';
import { useSession } from '@/contexts/SessionContext';
import { authClient } from '@/lib/authClient';
import type { App } from '@robscholey/contracts';

/** Props for the {@link AppFrame} component. */
export interface AppFrameProps {
  /** The sub-application to embed. */
  app: App;
  /** The sub-path to pass to the child app (segments after the slug). */
  subPath: string | null;
}

/**
 * Broadcasts a shell → child message to every `<iframe>` currently in the
 * document. Used so shell-level state updates (theme, accent) reach every
 * embedded sub-app at once — mirrors how the design calls for global
 * propagation rather than addressing the active iframe only.
 *
 * Each iframe receives the message targeted at its own origin (derived from
 * its `src`). Iframes whose `src` cannot be parsed (data URLs, blanks, etc.)
 * are skipped silently — there is no one to receive the message.
 */
function broadcastToIframes(message: ThemeUpdateMessage | AccentUpdateMessage) {
  const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[src]');
  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (!src) return;
    let targetOrigin: string;
    try {
      targetOrigin = new URL(src, window.location.origin).origin;
    } catch {
      return;
    }
    iframe.contentWindow?.postMessage(message, targetOrigin);
  });
}

/**
 * Renders a sub-application in a full-viewport iframe and manages the
 * bidirectional postMessage bridge between the shell and the child app.
 *
 * Sends a `shell-context` message on iframe load (and on `request-shell-context`),
 * carrying the shell-owned `theme` and `accent` so the child hydrates in
 * lock-step with the shell. Listens for `navigate-to-shell`,
 * `request-jwt-refresh`, `route-change`, `theme-change`, and `accent-change`
 * messages from the child. When a child requests a theme or accent change
 * the shell updates its own state (via {@link useTheme} / {@link useAccent}),
 * persists via `ShellKitProvider`, and broadcasts the new value as a
 * `theme-update` / `accent-update` to every mounted iframe so every
 * embedded app flips in sync. All outgoing messages are tagged with
 * `protocolVersion` and all incoming messages are parsed against the
 * child→shell zod schema so malformed or wrong-version messages drop.
 */
export function AppFrame({ app, subPath }: AppFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const { jwt, user, sessionToken } = useSession();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  const appOrigin = new URL(app.url).origin;

  // Pin theme + accent in refs so the message listener can read the latest
  // values without resubscribing every time they change. Mirrors the pattern
  // already used for the shell origin in useShellContext.
  const themeRef = useRef<ShellTheme>(theme);
  const accentRef = useRef<Accent>(accent);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    accentRef.current = accent;
  }, [accent]);

  /** Sends the shell-context message to the iframe. */
  const sendShellContext = useCallback(() => {
    const contentWindow = iframeRef.current?.contentWindow;
    if (!contentWindow) return;

    const message: ShellContextMessage = {
      type: 'shell-context',
      protocolVersion: PROTOCOL_VERSION,
      isEmbedded: true,
      showBackButton: true,
      shellOrigin: window.location.origin,
      jwt,
      user: user ? { id: user.id, name: user.name, type: user.type } : null,
      subPath,
      theme: themeRef.current,
      accent: accentRef.current,
    };

    contentWindow.postMessage(message, appOrigin);
  }, [jwt, user, subPath, appOrigin]);

  // Listen for child-to-shell messages
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== appOrigin) return;
      const message = parseChildMessage(event.data);
      if (!message) return;

      if (message.type === 'request-shell-context') {
        sendShellContext();
        return;
      }

      if (message.type === 'navigate-to-shell') {
        router.push('/');
        return;
      }

      if (message.type === 'request-jwt-refresh') {
        if (!sessionToken) return;
        authClient.auth
          .getSession(sessionToken)
          .then((session) => {
            const contentWindow = iframeRef.current?.contentWindow;
            if (!contentWindow) return;

            const refreshMessage: JWTRefreshMessage = {
              type: 'jwt-refresh',
              protocolVersion: PROTOCOL_VERSION,
              jwt: session.jwt,
            };
            contentWindow.postMessage(refreshMessage, appOrigin);
          })
          .catch(() => {
            // Session expired — child will detect via session-ended or next request
          });
        return;
      }

      if (message.type === 'route-change') {
        const path = message.path.replace(/^\/+/, '');
        const shellPath = path ? `/${app.id}/${path}` : `/${app.id}`;
        // Only push if the path actually changed (avoids duplicate history entries)
        if (shellPath !== window.location.pathname) {
          window.history.pushState(null, '', shellPath);
        }
        return;
      }

      if (message.type === 'theme-change') {
        // Update shell-owned state (persists to localStorage + flips the
        // shell's own <html data-theme>) and fan the new value out to every
        // mounted iframe so all embedded apps stay in sync.
        setTheme(message.theme);
        const update: ThemeUpdateMessage = {
          type: 'theme-update',
          protocolVersion: PROTOCOL_VERSION,
          theme: message.theme,
        };
        broadcastToIframes(update);
        return;
      }

      if (message.type === 'accent-change') {
        setAccent(message.accent);
        const update: AccentUpdateMessage = {
          type: 'accent-update',
          protocolVersion: PROTOCOL_VERSION,
          accent: message.accent,
        };
        broadcastToIframes(update);
        return;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [appOrigin, sendShellContext, sessionToken, app.id, router, setTheme, setAccent]);

  // Set document title to the app name while the iframe is active
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${app.name} — Rob Scholey`;
    return () => {
      document.title = previousTitle;
    };
  }, [app.name]);

  // Log access on mount (fire-and-forget)
  useEffect(() => {
    if (sessionToken) {
      authClient.auth.logAccess({ sessionToken, appId: app.id }).catch(() => {
        // Best-effort — don't block the iframe
      });
    }
  }, [sessionToken, app.id]);

  // Sync browser back/forward to the iframe via navigate-to-path
  useEffect(() => {
    function handlePopState() {
      const contentWindow = iframeRef.current?.contentWindow;
      if (!contentWindow) return;

      const pathname = window.location.pathname;
      const prefix = `/${app.id}/`;
      const childPath = pathname.startsWith(prefix)
        ? pathname.slice(prefix.length)
        : '';

      const message: NavigateToPathMessage = {
        type: 'navigate-to-path',
        protocolVersion: PROTOCOL_VERSION,
        path: childPath,
      };
      contentWindow.postMessage(message, appOrigin);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [app.id, appOrigin]);

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <iframe
        ref={iframeRef}
        src={app.url}
        title={app.name}
        className="h-full w-full border-0"
        allow="clipboard-write"
        onLoad={sendShellContext}
      />
    </div>
  );
}
