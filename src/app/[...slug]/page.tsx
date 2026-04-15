'use client';

import { use } from 'react';
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

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Skeleton className="h-12 w-48 rounded-lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/');
    return null;
  }

  const app = apps.find((a) => a.id === appId);

  if (!app) {
    router.replace('/');
    return null;
  }

  return <AppFrame app={app} subPath={subPath} />;
}
