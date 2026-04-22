'use client';

import type { ReactNode } from 'react';
import {
  AppCard,
  AppGrid,
  Button,
  Changelog,
  ChangelogItem,
  MetaGrid,
  MetaRow,
  Tag,
  Typography,
} from '@robscholey/shell-kit/ui';
import type { App, AppTag } from '@robscholey/contracts';
import { useSession } from '@/contexts/SessionContext';
import { formatExpiryRemaining, formatRelative } from '@/lib/format';
import { getVisual } from '@/components/visuals/registry';
import { changelog } from '@/content/changelog';

/**
 * Renders an app's config-sourced tag row. `null` when the app has no tags
 * configured — the AppCard drops the tag row entirely in that case.
 */
function renderTags(tags: AppTag[] | undefined): ReactNode {
  if (!tags || tags.length === 0) return null;
  return (
    <>
      {tags.map((t, i) => (
        <Tag key={`${t.label}-${i}`} {...(t.variant ? { variant: t.variant } : {})}>
          {t.label}
        </Tag>
      ))}
    </>
  );
}

/**
 * The `active: false` apps filtered out by `visibleAppsFor` on the auth
 * service so they can still render as "coming soon" tiles. Kept in lockstep
 * with `appsConfig.json` entries whose `active` is `false` — the fact that
 * the session API intentionally elides inactive apps makes a client-side
 * mirror the simplest path here (a parallel endpoint would duplicate config
 * and a second `SessionResponse` field would leak inactive-app metadata to
 * every consumer that doesn't need it).
 */
const PLACEHOLDER_APPS: ReadonlyArray<
  Pick<App, 'id' | 'name' | 'description' | 'defaultAccent' | 'tags'>
> = [
  {
    id: 'canopy',
    name: 'Canopy',
    description: 'Headless content layer. Paused — brief on the portfolio.',
    defaultAccent: 'teal',
    tags: [{ label: 'paused' }],
  },
];

/**
 * Derives the "tier" meta-row from the current user. Owner sessions read
 * `"owner"`; every other session (named or anonymous) reads `"guest"`.
 */
function tierLabelFor(userType: 'owner' | 'named' | 'anonymous'): string {
  return userType === 'owner' ? 'owner' : 'guest';
}

/**
 * Derives the "code" meta-row. Owner-minted sessions — or codes without an
 * expiry — render as the em-dash sentinel. Live codes surface a `"valid · Xd
 * left"` stamp; past timestamps collapse to `"expired"`.
 */
function codeLabelFor(codeExpiresAt: string | null): string {
  if (!codeExpiresAt) return '—';
  const remaining = formatExpiryRemaining(codeExpiresAt);
  return remaining === 'expired' ? 'expired' : `valid · ${remaining}`;
}

/**
 * The post-auth app launcher. Replaces the previous list-style `AppNav` with
 * the handoff's card grid: an intro row with session meta, a featured-plus-
 * regular card grid, a greyed-out placeholder row for paused apps, and a
 * cross-platform changelog strip underneath.
 *
 * Reads all state from {@link useSession}; no props needed.
 */
export function AppSelector() {
  const { user, apps, codeExpiresAt, logout } = useSession();

  // The selector is only rendered from the authenticated branch of the page,
  // so `user` is effectively non-null here. The explicit guard keeps the
  // types honest and avoids an unchecked `user!` dereference later.
  if (!user) return null;

  const tierLabel = tierLabelFor(user.type);
  const codeLabel = codeLabelFor(codeExpiresAt);
  const appsLabel = `${apps.length} of ${apps.length}`;

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[1100px] flex-1 px-5 pt-7 pb-20"
    >
      <section className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 space-y-3">
          <Typography variant="mono-label" as="div" withAccent>
            signed in
          </Typography>
          <Typography variant="h1">Choose an app.</Typography>
          <Typography variant="body" className="text-text-muted max-w-[54ch]">
            You&apos;re on the shell — a small launcher for the apps on this platform. Every
            app runs isolated; your session carries across.
          </Typography>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <MetaGrid>
            <MetaRow k="tier" v={tierLabel} />
            <MetaRow k="code" v={codeLabel} />
            <MetaRow k="apps" v={appsLabel} />
          </MetaGrid>
          <Button variant="ghost" size="sm" onClick={() => logout()} className="self-start md:self-end">
            Log out
          </Button>
        </div>
      </section>

      <AppGrid aria-label="Available apps">
        {apps.map((app) => {
          const tags = renderTags(app.tags);
          const meta =
            app.version && app.lastUpdatedAt
              ? `v${app.version} · ${formatRelative(app.lastUpdatedAt)} ago`
              : app.version
                ? `v${app.version}`
                : undefined;
          return (
            <AppCard
              key={app.id}
              href={`/${app.id}`}
              title={app.name}
              description={app.description}
              status={app.statusVariant ?? 'live'}
              accent={app.defaultAccent}
              featured={app.id === 'portfolio'}
              visual={getVisual(app.visualKey)}
              {...(app.visualMark !== undefined ? { visualMark: app.visualMark } : {})}
              {...(tags !== null ? { tags } : {})}
              {...(meta !== undefined ? { meta } : {})}
            />
          );
        })}
        {PLACEHOLDER_APPS.map((app) => (
          <AppCard
            key={app.id}
            placeholder
            title={app.name}
            description={app.description}
            status="soon"
            accent={app.defaultAccent}
            {...(app.tags !== undefined ? { tags: renderTags(app.tags) } : {})}
          />
        ))}
      </AppGrid>

      <section className="mt-10" aria-label="Across the platform">
        <header className="mb-3 flex items-center gap-3">
          <Typography variant="mono-label" as="span">
            across the platform
          </Typography>
          <Typography variant="h3" as="h3">
            Recent
          </Typography>
        </header>
        <Changelog>
          {changelog.map((entry) => (
            <ChangelogItem
              key={entry.id}
              accent={entry.accent}
              app={entry.app}
              when={entry.when}
            >
              {entry.message}
            </ChangelogItem>
          ))}
        </Changelog>
      </section>
    </main>
  );
}
