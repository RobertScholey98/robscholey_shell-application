'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@robscholey/shell-kit/ui';
import { useSession } from '@/contexts/SessionContext';
import { AuthClientError } from '@/lib/authClient';

/**
 * Owner login dialog. Opens automatically when `?owner` is in the URL.
 * Provides username/password form that authenticates via the session context.
 */
export function OwnerLogin() {
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useSession();

  const [open, setOpen] = useState(searchParams.get('owner') !== null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) return null;

  /**
   * Handles login form submission.
   * On success, closes the dialog. On failure, displays the error message.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Owner login</DialogTitle>
          <DialogDescription>Sign in with your owner credentials.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
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
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !username.trim() || !password.trim()}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
