'use client';

import { useId, useState } from 'react';
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
  Textarea,
  Typography,
  toast,
} from '@robscholey/shell-kit/ui';
import { authClient, AuthClientError } from '@/lib/authClient';
import { useSession } from '@/contexts/SessionContext';
import type { actions } from '@/content/homepage';

type ContactAction = (typeof actions)[keyof typeof actions];

/** Shape of the `actions.message` field descriptors (text / email / textarea). */
type ContactField = ContactAction['fields'][number];

/** Props for {@link ContactActionDrawer}. */
export interface ContactActionDrawerProps {
  /** The content config for this drawer — copy, labels, placeholders. */
  action: ContactAction;
  /**
   * Discriminator for the submit handler. `message` wires the form to
   * `POST /public/messages`; `access` stays a no-op for now (backend lands
   * with Phase 3d notifications).
   */
  kind: 'message' | 'access';
}

/** State machine for the drawer's submit lifecycle. */
type SubmitState = 'idle' | 'submitting' | 'sent';

/**
 * Renders the "Send me a message" / "Request portfolio access" drawer on the
 * landing page. Hoists its own form state so the submit handler can read the
 * fields without prop-threading every input back to the parent.
 *
 * On `kind === 'message'`:
 * 1. Submits to the typed {@link authClient}'s `public.sendMessage`, passing
 *    the visitor's current `sessionToken` when one exists so the owner can
 *    see session context on the thread.
 * 2. Toasts the outcome — 429 surfaces a rate-limit message, 4xx surfaces
 *    the server message, network / unexpected errors fall back to a generic.
 * 3. Swaps the form body for a "Sent" acknowledgement so the visitor
 *    doesn't double-submit.
 *
 * The `access` kind keeps the original no-op submit — full wiring lands
 * with the notifications phase.
 *
 * @param props - The action config + submit-kind discriminator.
 * @returns A trigger button that opens the drawer.
 */
export function ContactActionDrawer({ action, kind }: ContactActionDrawerProps) {
  const { sessionToken } = useSession();
  const formId = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmitState>('idle');

  function update(field: ContactField, value: string) {
    setValues((prev) => ({ ...prev, [field.id]: value }));
  }

  function reset() {
    setValues({});
    setState('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (kind !== 'message') return;

    const name = values['message-name']?.trim() ?? '';
    const email = values['message-email']?.trim() ?? '';
    const body = values['message-body']?.trim() ?? '';

    if (!name || !email || !body) {
      toast.error('Please fill out every field before sending.');
      return;
    }

    setState('submitting');
    try {
      await authClient.public.sendMessage({
        name,
        email,
        body,
        ...(sessionToken ? { sessionToken } : {}),
      });
      setState('sent');
      toast.success('Message sent — Rob will get back to you.');
    } catch (err) {
      setState('idle');
      if (err instanceof AuthClientError) {
        if (err.status === 429) {
          toast.error('Too many messages just now. Give it a minute and try again.');
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('Something went wrong sending your message.');
      }
    }
  }

  return (
    <Drawer
      onOpenChange={(open) => {
        // Reset between openings so a closed "Sent" drawer re-opens fresh.
        if (!open && state === 'sent') reset();
      }}
    >
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

        {state === 'sent' ? (
          <div className="mt-4 space-y-4 px-4">
            <Typography variant="small" align="center">
              Thanks — Rob will get back to you shortly.
            </Typography>
            <DrawerFooter>
              <Button type="button" size="lg" className="w-full" onClick={reset}>
                Send another
              </Button>
            </DrawerFooter>
          </div>
        ) : (
          <form
            id={formId}
            className="space-y-4 mt-4"
            onSubmit={kind === 'message' ? handleSubmit : (e) => e.preventDefault()}
          >
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
                    value={values[field.id] ?? ''}
                    onChange={(e) => update(field, e.target.value)}
                    disabled={state === 'submitting'}
                  />
                ) : (
                  <Input
                    id={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
                    inputMode={field.type === 'email' ? 'email' : undefined}
                    value={values[field.id] ?? ''}
                    onChange={(e) => update(field, e.target.value)}
                    disabled={state === 'submitting'}
                  />
                )}
              </div>
            ))}
            <DrawerFooter>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={state === 'submitting'}
              >
                {state === 'submitting' ? 'Sending…' : action.submitLabel}
              </Button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
