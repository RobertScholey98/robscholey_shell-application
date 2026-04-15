'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
} from '@robscholey/shell-kit/ui';
import { useSession } from '@/contexts/SessionContext';
import { AuthClientError } from '@/lib/authClient';

/** Props for the {@link OwnerLogin} component. */
export interface OwnerLoginProps {
  /** Whether the drawer is open. */
  open: boolean;
  /** Callback to change the open state. */
  onOpenChange: (open: boolean) => void;
}

/**
 * Owner login drawer. Controlled by parent via `open`/`onOpenChange` props.
 * Provides username/password form that authenticates via the session context.
 */
export function OwnerLogin({ open, onOpenChange }: OwnerLoginProps) {
  const { login, isAuthenticated } = useSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Reset form state when the drawer closes. */
  useEffect(() => {
    if (!open) {
      setUsername('');
      setPassword('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  if (isAuthenticated) return null;

  /**
   * Handles login form submission.
   * On success, closes the drawer. On failure, displays the error message.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof AuthClientError) {
        if (err.status === 429) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError('Invalid credentials');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Owner login</DrawerTitle>
          <DrawerDescription>Sign in with your owner credentials.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4" aria-busy={isSubmitting}>
          <div className="space-y-2">
            <Label htmlFor="owner-username">Username</Label>
            <Input
              id="owner-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="Username"
              disabled={isSubmitting}
              autoComplete="username"
              aria-invalid={!!error}
              aria-describedby={error ? 'owner-error' : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-password">Password</Label>
            <Input
              id="owner-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              disabled={isSubmitting}
              autoComplete="current-password"
              aria-invalid={!!error}
              aria-describedby={error ? 'owner-error' : undefined}
            />
          </div>
          {error && (
            <p id="owner-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DrawerFooter>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting || !username.trim() || !password.trim()}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
