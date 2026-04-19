'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ShellContextMessage, JWTRefreshMessage, NavigateToPathMessage } from '@robscholey/shell-kit';
import { useSession } from '@/contexts/SessionContext';
import * as authClient from '@/lib/authClient';
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
 * Sends a `shell-context` message on iframe load (and on `request-shell-context`).
 * Listens for `navigate-to-shell`, `request-jwt-refresh`, `route-change`, and
 * `theme-change` messages from the child.
 */
export function AppFrame({ app, subPath }: AppFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const { jwt, user, sessionToken } = useSession();

  const appOrigin = new URL(app.url).origin;

  /** Sends the shell-context message to the iframe. */
  const sendShellContext = useCallback(() => {
    const contentWindow = iframeRef.current?.contentWindow;
    if (!contentWindow) return;

    const message: ShellContextMessage = {
      type: 'shell-context',
      isEmbedded: true,
      showBackButton: true,
      shellOrigin: window.location.origin,
      jwt,
      user: user ? { id: user.id, name: user.name, type: user.type } : null,
      subPath,
      theme: 'light',
    };

    contentWindow.postMessage(message, appOrigin);
  }, [jwt, user, subPath, appOrigin]);

  // Listen for child-to-shell messages
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== appOrigin) return;
      if (typeof event.data?.type !== 'string') return;

      const { type } = event.data;

      if (type === 'request-shell-context') {
        sendShellContext();
        return;
      }

      if (type === 'navigate-to-shell') {
        router.push('/');
        return;
      }

      if (type === 'request-jwt-refresh') {
        if (!sessionToken) return;
        authClient
          .getSession(sessionToken)
          .then((session) => {
            const contentWindow = iframeRef.current?.contentWindow;
            if (!contentWindow) return;

            const refreshMessage: JWTRefreshMessage = {
              type: 'jwt-refresh',
              jwt: session.jwt,
            };
            contentWindow.postMessage(refreshMessage, appOrigin);
          })
          .catch(() => {
            // Session expired — child will detect via session-ended or next request
          });
        return;
      }

      if (type === 'route-change') {
        const rawPath = event.data.path;
        if (typeof rawPath === 'string') {
          const path = rawPath.replace(/^\/+/, '');
          const shellPath = path ? `/${app.id}/${path}` : `/${app.id}`;
          // Only push if the path actually changed (avoids duplicate history entries)
          if (shellPath !== window.location.pathname) {
            window.history.pushState(null, '', shellPath);
          }
        }
        return;
      }

      // theme-change: no-op until theme system is built
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [appOrigin, sendShellContext, sessionToken, app.id, router]);

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
      authClient.logAccess(sessionToken, app.id).catch(() => {
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
