'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@robscholey/shell-kit/ui';
import { AppFrame } from '@/components/AppFrame';
import { useSession } from '@/contexts/SessionContext';

/** Catch-all page for sub-application routes. Extracts the app slug and sub-path from the URL. */
export default function AppPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { apps, isAuthenticated, isLoading } = useSession();

  const appId = slug[0];
  const subPath = slug.length > 1 ? slug.slice(1).join('/') : null;
  const app = isLoading || !isAuthenticated ? null : apps.find((a) => a.id === appId);
  const needsRedirectUnauth = !isLoading && !isAuthenticated;
  const needsRedirectHome = !isLoading && isAuthenticated && !app;

  // Keep router.replace out of the render body — the `next/navigation` router
  // reads `location` during replace, which throws on the server. An effect
  // defers both redirects until the client has mounted.
  useEffect(() => {
    if (needsRedirectUnauth) {
      const pathname = `/${slug.join('/')}`;
      router.replace(`/?next=${encodeURIComponent(pathname)}`);
    } else if (needsRedirectHome) {
      router.replace('/');
    }
  }, [needsRedirectUnauth, needsRedirectHome, router, slug]);

  if (isLoading || needsRedirectUnauth || needsRedirectHome) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Skeleton className="h-12 w-48 rounded-lg" />
      </div>
    );
  }

  if (!app) return null;
  return <AppFrame app={app} subPath={subPath} />;
}
