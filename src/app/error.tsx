'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button, Typography } from '@robscholey/shell-kit/ui';

/** Props supplied by Next.js to the route-level error boundary. */
interface ErrorPageProps {
  /** The thrown value that broke rendering. `digest` is added in production builds. */
  error: Error & { digest?: string };
  /** Re-renders the segment from scratch. */
  reset: () => void;
}

/**
 * Next.js App Router error boundary for the shell. Catches render-time
 * errors anywhere below the root layout so a broken route shows a recovery
 * panel instead of a blank page. The console.error is intentional — render
 * crashes happen before any structured logger is mounted in the tree.
 */
export default function ShellErrorBoundary({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('shell.errorBoundary', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <Typography variant="h3">Something went wrong</Typography>
      <Typography variant="muted" className="max-w-sm">
        {error.message || 'An unexpected error stopped this page from rendering.'}
      </Typography>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </main>
  );
}
