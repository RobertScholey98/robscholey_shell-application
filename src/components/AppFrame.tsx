'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  PROTOCOL_VERSION,
  parseChildMessage,
  type JWTRefreshMessage,
  type NavigateToPathMessage,
  type ShellContextMessage,
} from '@robscholey/shell-kit';
import { useSession } from '@/contexts/SessionContext';
import { authClient } from '@/lib/authClient';
import { usePageThemeRegistry } from '@/contexts/PageThemeContext';
import type { App } from '@robscholey/contracts';

/** Props for the {@link AppFrame} component. */
export interface AppFrameProps {
  /** The sub-application to embed. */
  app: App;
  /** The sub-path to pass to the child app (segments after the slug). */
  subPath: string | null;
}

/**
 * Renders a sub-application in a full-viewport iframe and manages the
 * bidirectional postMessage bridge between the shell and the child app.
 *
 * Sends a `shell-context` message on iframe load (and on
 * `request-shell-context`) carrying identity-only fields — theme and accent
 * are page-owned as of protocol v2 (Phase I), so the child's SSR layout
 * paints the right values without needing the shell to push them.
 *
 * Listens for `navigate-to-shell`, `request-jwt-refresh`, `route-change`,
 * and `page-theme` messages from the child. Page-theme declarations are
 * stored per-iframe in the {@link usePageThemeRegistry} so future
 * cross-cutting shell chrome (chat bubble, messaging surfaces) can render
 * in the same visual language as whichever iframe is currently active.
 *
 * All outgoing messages are tagged with `protocolVersion` and all incoming
 * messages are parsed against the child→shell zod schema so malformed or
 * wrong-version messages drop with a console warning rather than corrupt
 * state silently.
 */
export function AppFrame({ app, subPath }: AppFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const { jwt, user, sessionToken } = useSession();
  const { record: recordPageTheme } = usePageThemeRegistry();

  const appOrigin = new URL(app.url).origin;

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

      if (message.type === 'page-theme') {
        // The child's <PageTheme> declared (or cleared) its page-level
        // override. Stash it per-iframe so future cross-cutting chrome
        // can read the active iframe's accent.
        recordPageTheme(app.id, { theme: message.theme, accent: message.accent });
        return;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [appOrigin, sendShellContext, sessionToken, app.id, router, recordPageTheme]);

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
