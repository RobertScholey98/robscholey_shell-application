'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Input,
  Label,
  Separator,
  Textarea,
  Typography,
} from '@robscholey/shell-kit/ui';
import { identity, tagline, socialLinks, actions } from '@/content/homepage';
import { GithubIcon, LinkedInIcon } from '@/components/icons';
import { AppSelector } from '@/components/AppSelector';
import { CodeInput } from '@/components/CodeInput';
import { OwnerLogin } from '@/components/OwnerLogin';
import { useSession } from '@/contexts/SessionContext';

const iconMap = {
  github: GithubIcon,
  linkedin: LinkedInIcon,
} as const;

/** Renders a drawer triggered by a button. */
function ActionDrawer({
  action,
}: {
  action: (typeof actions)[keyof typeof actions];
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full sm:w-auto">
          {action.cardTitle}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{action.dialogTitle}</DrawerTitle>
          <DrawerDescription>{action.dialogDescription}</DrawerDescription>
        </DrawerHeader>
        <form className="space-y-4 mt-4" onSubmit={(e) => e.preventDefault()}>
          {action.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {'labelSuffix' in field && (
                  <Typography variant="small" as="span" className="font-normal">
                    {' '}
                    {field.labelSuffix}
                  </Typography>
                )}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  rows={'rows' in field ? field.rows : 3}
                />
              ) : (
                <Input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  inputMode={field.type === 'email' ? 'email' : undefined}
                />
              )}
            </div>
          ))}
          <DrawerFooter>
            <Button type="submit" size="lg" className="w-full">
              {action.submitLabel}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

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
          <ActionDrawer action={actions.access} />
          <ActionDrawer action={actions.message} />
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
                className="flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground active:text-foreground transition-colors"
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
    return <AppSelector />;
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
