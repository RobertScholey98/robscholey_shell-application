'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@robscholey/shell-kit/ui';
import { useSession } from '@/contexts/SessionContext';
import { AuthClientError } from '@/lib/authClient';

/** Access code input with optional password field. Validates against the auth service. */
export function CodeInput() {
  const { submitCode } = useSession();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Handles form submission — validates the code, shows password field if needed, or sets session on success. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await submitCode(code, needsPassword ? password : undefined);

      if (result && 'requiresPassword' in result) {
        setNeedsPassword(true);
        setIsSubmitting(false);
        return;
      }

      // Success — session context is now populated, component will unmount or parent will react
    } catch (err) {
      if (err instanceof AuthClientError) {
        if (err.status === 429) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="access-code">Access code</Label>
        <Input
          id="access-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
            if (!needsPassword) setPassword('');
          }}
          placeholder="Enter your access code"
          disabled={isSubmitting}
          autoComplete="off"
        />
      </div>

      {needsPassword && (
        <div className="space-y-2">
          <Label htmlFor="access-password">Password</Label>
          <Input
            id="access-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Enter your password"
            disabled={isSubmitting}
            autoFocus
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isSubmitting || !code.trim()} className="w-full">
        {isSubmitting ? 'Validating...' : needsPassword ? 'Submit' : 'Enter'}
      </Button>
    </form>
  );
}
