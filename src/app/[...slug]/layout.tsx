import type { Metadata } from 'next';
import { authClient } from '@/lib/authClient';

/** Generates per-app metadata (title, OG tags) using the public app meta endpoint. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const appSlug = slug[0];
  const meta = await authClient.public.getAppMeta(appSlug);

  if (!meta) {
    return { title: 'Rob Scholey' };
  }

  const title = `${meta.name} — Rob Scholey`;

  return {
    title,
    openGraph: {
      title,
      type: 'website',
    },
  };
}

/** Layout for sub-app routes. Passes through children (the client page component). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
