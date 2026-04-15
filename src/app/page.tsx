'use client';

import { MessageSquare, KeyRound } from 'lucide-react';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Separator,
  Textarea,
} from '@robscholey/shell-kit/ui';
import { identity, bio, socialLinks, actions } from '@/content/homepage';
import { GithubIcon, LinkedInIcon } from '@/components/icons';
import { Suspense } from 'react';
import { CodeInput } from '@/components/CodeInput';
import { OwnerLogin } from '@/components/OwnerLogin';
import { useSession } from '@/contexts/SessionContext';

const iconMap = {
  github: GithubIcon,
  linkedin: LinkedInIcon,
} as const;

const actionIconMap = {
  message: MessageSquare,
  access: KeyRound,
} as const;

/** Renders a dialog with a form from action content config. */
function ActionDialog({
  actionKey,
  action,
}: {
  actionKey: keyof typeof actionIconMap;
  action: (typeof actions)[keyof typeof actions];
}) {
  const Icon = actionIconMap[actionKey];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer transition-colors hover:bg-accent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{action.cardTitle}</CardTitle>
            </div>
            <CardDescription>{action.cardDescription}</CardDescription>
          </CardHeader>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action.dialogTitle}</DialogTitle>
          <DialogDescription>{action.dialogDescription}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4">
          {action.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {'labelSuffix' in field && (
                  <span className="text-muted-foreground font-normal"> {field.labelSuffix}</span>
                )}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  rows={'rows' in field ? field.rows : 3}
                />
              ) : (
                <Input id={field.id} type={field.type} placeholder={field.placeholder} />
              )}
            </div>
          ))}
        </form>
        <DialogFooter>
          <Button type="submit">{action.submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Public homepage — bio, contact, and access request. */
export default function Home() {
  const { isAuthenticated, isLoading } = useSession();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">{identity.name}</h1>
          <p className="text-xl text-muted-foreground">{identity.title}</p>
        </div>

        <div className="space-y-4 text-muted-foreground leading-relaxed">
          {bio.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <Separator />

        {!isLoading && !isAuthenticated && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Have an access code?</h2>
              <CodeInput />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {socialLinks.map((link) => {
            const Icon = iconMap[link.icon];
            return (
              <Button key={link.href} variant="outline" asChild>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  <Icon />
                  {link.label}
                </a>
              </Button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ActionDialog actionKey="message" action={actions.message} />
          <ActionDialog actionKey="access" action={actions.access} />
        </div>
      </div>

      <Suspense>
        <OwnerLogin />
      </Suspense>
    </main>
  );
}
