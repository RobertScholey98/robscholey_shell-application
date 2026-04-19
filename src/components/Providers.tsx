'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { SessionProvider } from '@/contexts/SessionContext';
import type { SessionResponse } from '@/lib/types';

/** Props for the {@link Providers} component. */
export interface ProvidersProps {
  children: ReactNode;
  /** Session pre-resolved on the server, used to skip the client-side auth flash. */
  initialSession: SessionResponse | null;
}

/** Client-side providers wrapper. Used in the root layout to provide context to all pages. */
export function Providers({ children, initialSession }: ProvidersProps) {
  return (
    <SessionProvider initialSession={initialSession}>
      {children}
      <Toaster position="top-center" richColors />
    </SessionProvider>
  );
}
