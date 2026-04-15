'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Typography } from '@robscholey/shell-kit/ui';
import { useSession } from '@/contexts/SessionContext';

/**
 * Displays permitted apps as a tappable list with descriptions.
 * Each row is a minimum 48px touch target per mobile UX guidelines.
 * Only renders when the user has a valid session with at least one app.
 */
export function AppNav() {
  const { apps, isAuthenticated, isLoading } = useSession();

  if (isLoading || !isAuthenticated || apps.length === 0) return null;

  return (
    <nav aria-label="Your apps">
      <ul className="divide-y divide-border rounded-xl border overflow-hidden">
        {apps.map((app) => (
          <li key={app.id}>
            <Link
              href={`/${app.id}`}
              className="flex items-center gap-3 px-4 py-3 min-h-[56px] bg-card transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="flex-1 min-w-0">
                <Typography variant="body" as="div" className="font-medium truncate">
                  {app.name}
                </Typography>
                {app.description && (
                  <Typography variant="small" as="div" className="truncate">
                    {app.description}
                  </Typography>
                )}
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
