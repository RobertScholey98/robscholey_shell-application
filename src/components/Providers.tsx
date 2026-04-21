'use client';

import type { ReactNode } from 'react';
import { ShellKitProvider } from '@robscholey/shell-kit';
import { Toaster } from '@robscholey/shell-kit/ui';
import { SessionProvider } from '@/contexts/SessionContext';
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
 * to all pages. Wraps the tree in `<ShellKitProvider>` so the shell itself
 * owns the theme + accent state that `AppFrame` then broadcasts to every
 * embedded sub-app. Teal is declared as the default accent — it is the
 * brand colour and the design-system default.
 */
export function Providers({ children, initialSession }: ProvidersProps) {
  return (
    <ShellKitProvider
      config={{ shellOrigin: SHELL_ORIGIN }}
      defaultTheme="dark"
      defaultAccent="teal"
    >
      <SessionProvider initialSession={initialSession}>
        {children}
        <Toaster position="top-center" richColors />
      </SessionProvider>
    </ShellKitProvider>
  );
}
