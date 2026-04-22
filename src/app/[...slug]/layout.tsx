import type { Metadata } from 'next';
import { appMetaSchema } from '@robscholey/contracts';
import { authClient } from '@/lib/authClient';

/**
 * Generates per-app metadata (title, OG tags) using the public app-meta
 * endpoint. The response is zod-validated before any field reaches the
 * `<title>` / OG tags — defense-in-depth against a compromised or
 * malfunctioning auth service returning untrusted strings.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const appSlug = slug[0];
  const raw = await authClient.public.getAppMeta(appSlug);

  if (!raw) {
    return { title: 'Rob Scholey' };
  }

  const parsed = appMetaSchema.safeParse(raw);
  if (!parsed.success) {
    // Malformed meta — fall back to the generic shell title rather than
    // interpolating unvalidated data. An auth-service bug shouldn't land
    // user-controlled strings in HTML.
    return { title: 'Rob Scholey' };
  }

  const title = `${parsed.data.name} — Rob Scholey`;

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
