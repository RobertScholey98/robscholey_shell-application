'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from '@/contexts/SessionContext';

/** Client-side providers wrapper. Used in the root layout to provide context to all pages. */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
