'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Separator, Typography } from '@robscholey/shell-kit/ui';
import { identity, tagline, socialLinks, actions } from '@/content/homepage';
import { GithubIcon, LinkedInIcon } from '@/components/icons';
import { AppSelector } from '@/components/AppSelector';
import { AuthedChrome } from '@/components/AuthedChrome';
import { CodeInput } from '@/components/CodeInput';
import { ContactActionDrawer } from '@/components/ContactActionDrawer';
import { OwnerLogin } from '@/components/OwnerLogin';
import { useSession } from '@/contexts/SessionContext';

const iconMap = {
  github: GithubIcon,
  linkedin: LinkedInIcon,
} as const;

/** Unauthenticated view — clean lock screen with clear user journey segmentation. */
function LandingView() {
  const [ownerLoginOpen, setOwnerLoginOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:py-16">
      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
        {/* Profile photo */}
        <div className="mb-4">
          <Image
            src="/rob.png"
            alt="Rob Scholey"
            width={100}
            height={100}
            className="rounded-full object-cover"
            priority
          />
        </div>

        {/* Name — tapping opens owner login (no visual indication) */}
        <Typography
          variant="h1"
          align="center"
          className="cursor-default"
          onClick={() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            setOwnerLoginOpen(true);
          }}
        >
          {identity.name}
        </Typography>
        <Typography variant="h3" align="center" className="mt-1">
          {identity.title}
        </Typography>
        <Typography variant="small" align="center" className="mt-2">
          {tagline}
        </Typography>

        {/* Primary action: the gate */}
        <section aria-label="Access code entry" className="w-full mt-6">
          <CodeInput />
        </section>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 mt-6 mb-4">
          <Separator className="flex-1" />
          <Typography variant="small" as="span" className="whitespace-nowrap">
            Need access?
          </Typography>
          <Separator className="flex-1" />
        </div>

        {/* Secondary actions */}
        <div className="w-full flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <ContactActionDrawer action={actions.access} kind="access" />
          <ContactActionDrawer action={actions.message} kind="message" />
        </div>

        {/* Social footer */}
        <div className="flex gap-2 mt-6">
          {socialLinks.map((link) => {
            const Icon = iconMap[link.icon];
            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-muted hover:text-text active:text-text transition-colors"
              >
                <Icon className="h-5 w-5" />
              </a>
            );
          })}
        </div>

        <OwnerLogin open={ownerLoginOpen} onOpenChange={setOwnerLoginOpen} />
      </div>
    </div>
  );
}

/** Checks that a next path is safe to redirect to (prevents open redirects). */
function isValidNextPath(path: string): boolean {
  return path.startsWith('/') && !path.includes('://');
}

/** Homepage inner content — reads search params for intended destination redirect. */
function HomeContent() {
  const { isAuthenticated, user } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextPath = searchParams.get('next');

  useEffect(() => {
    if (isAuthenticated && nextPath && isValidNextPath(nextPath)) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, nextPath, router]);

  if (isAuthenticated && user) {
    return (
      <>
        <AuthedChrome />
        <AppSelector />
      </>
    );
  }

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <LandingView />
    </main>
  );
}

/** Homepage — switches between lock screen and app launcher. */
export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
