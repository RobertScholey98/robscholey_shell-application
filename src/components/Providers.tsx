'use client';

import type { ReactNode } from 'react';
import { ShellKitProvider } from '@robscholey/shell-kit';
import { Toaster } from '@robscholey/shell-kit/ui';
import { SessionProvider } from '@/contexts/SessionContext';
import { PageThemeRegistryProvider } from '@/contexts/PageThemeContext';
import type { SessionResponse } from '@robscholey/contracts';

// Shell is its own origin: postMessage to/from children targets this value.
// Mirrors the env contract used by admin + template-child so docker-compose
// can inject a single value and every piece of the stack agrees on it.
const SHELL_ORIGIN = process.env.NEXT_PUBLIC_SHELL_ORIGIN || 'http://localhost:3000';

/** Props for the {@link Providers} component. */
export interface ProvidersProps {
  children: ReactNode;
  /** Session pre-resolved on the server, used to skip the client-side auth flash. */
  initialSession: SessionResponse | null;
}

/**
 * Client-side providers wrapper. Used in the root layout to provide context
 * to all pages.
 *
 * - `<ShellKitProvider>` carries the shell origin so child-targeted
 *   postMessage and message-listener paths know who they're talking to.
 *   Theme + accent are page-owned (Phase I), so the provider holds no
 *   theme state of its own.
 * - `<PageThemeRegistryProvider>` collects the per-iframe `page-theme`
 *   declarations that `AppFrame` records, exposed to future
 *   cross-cutting chrome (chat bubble, messaging surfaces) so they can
 *   render in the visual language of whichever iframe is active.
 */
export function Providers({ children, initialSession }: ProvidersProps) {
  return (
    <ShellKitProvider config={{ shellOrigin: SHELL_ORIGIN }}>
      <PageThemeRegistryProvider>
        <SessionProvider initialSession={initialSession}>
          {children}
          <Toaster position="top-center" richColors />
        </SessionProvider>
      </PageThemeRegistryProvider>
    </ShellKitProvider>
  );
}
