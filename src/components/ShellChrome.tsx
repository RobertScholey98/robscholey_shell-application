'use client';

import Link from 'next/link';
import { SessionPill } from '@robscholey/shell-kit/ui';
import { useSession } from '@/contexts/SessionContext';
import type { User } from '@robscholey/contracts';

/**
 * Derives the session-pill label from the user. Owner sessions read
 * `"owner · name"`; named guest sessions read `"guest · name"`; anonymous
 * sessions render as a bare `"guest"` — no name to dot-join to.
 */
function pillLabelFor(user: User): string {
  if (user.type === 'owner') return `owner · ${user.name}`;
  if (user.type === 'named') return `guest · ${user.name}`;
  return 'guest';
}

/**
 * The shell's persistent top-bar chrome. Renders unconditionally; the parent
 * layout gates it on the authenticated state so the landing page can stay
 * chromeless. Contains the `rs.` brand and a session pill derived from the
 * current user.
 *
 * Layout follows the selector handoff: a 1100 px-capped inner, a three-column
 * grid (`brand · filler · pill`), and a blurred translucent bar that sits
 * above the page content.
 */
export function ShellChrome() {
  const { user } = useSession();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-[10px]">
      <div className="mx-auto grid max-w-[1100px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3.5">
        <Link
          href="/"
          className="font-mono text-[1.1rem] font-semibold text-text no-underline"
        >
          rs<span className="text-accent">.</span>
        </Link>
        <div aria-hidden />
        <SessionPill>{pillLabelFor(user)}</SessionPill>
      </div>
    </header>
  );
}
