'use client';

import { ShellChrome } from '@/components/ShellChrome';
import { useSession } from '@/contexts/SessionContext';

/**
 * Client-side gate for {@link ShellChrome}. Mounted from the root layout so
 * the chrome renders on every authenticated route without the landing page
 * having to opt out. The layout is a server component, so this thin wrapper
 * exists purely to consume {@link useSession} from the client boundary.
 */
export function AuthedChrome() {
  const { isAuthenticated } = useSession();
  if (!isAuthenticated) return null;
  return <ShellChrome />;
}
