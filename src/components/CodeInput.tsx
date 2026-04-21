'use client';

import { useState } from 'react';
import { Button, Input, Label, toast } from '@robscholey/shell-kit/ui';
import { useSession } from '@/contexts/SessionContext';
import { AuthClientError } from '@robscholey/contracts';

/** Access code input pinned to the bottom of the viewport. Uses sonner toasts for error feedback. */
export function CodeInput() {
  const { submitCode } = useSession();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Handles form submission — validates the code, shows password field if needed, or sets session on success. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await submitCode(code, needsPassword ? password : undefined);

      if (result && 'requiresPassword' in result) {
        setNeedsPassword(true);
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      if (err instanceof AuthClientError) {
        if (err.status === 429) {
          toast.error('Too many attempts. Please try again later.');
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-3">
      <Label htmlFor="access-code" className="sr-only">
        Access code
      </Label>
      <Input
        id="access-code"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          if (!needsPassword) setPassword('');
        }}
        placeholder="Access code"
        disabled={isSubmitting}
        autoComplete="off"
        autoCapitalize="characters"
      />

      {needsPassword && (
        <>
          <Label htmlFor="access-password" className="sr-only">
            Password
          </Label>
          <Input
            id="access-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={isSubmitting}
          />
        </>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !code.trim() || (needsPassword && !password.trim())}
        size="lg"
        className="w-full"
      >
        {isSubmitting ? 'Validating...' : needsPassword ? 'Submit' : 'Enter'}
      </Button>
    </form>
  );
}
