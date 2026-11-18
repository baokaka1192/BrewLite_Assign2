'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { register } from '@/lib/auth';
import { PASSWORD_MAX, PASSWORD_MIN, validateRegister, type FieldErrors } from '@/lib/auth-validation';
import { AuthField } from '@/components/auth/auth-field';
import { Button } from '@/components/ui/button';

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setServerError(null);

    const fieldErrors = validateRegister({ email, password });
    setErrors(fieldErrors);
    if (fieldErrors.email) return emailRef.current?.focus();
    if (fieldErrors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      await register({ email, password, name });
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: 'This email is already registered. Try logging in instead.' });
        emailRef.current?.focus();
      } else {
        setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-6" aria-busy={submitting}>
      {serverError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </p>
      )}
      <AuthField
        label="Name (optional)"
        name="name"
        autoComplete="name"
        value={name}
        disabled={submitting}
        onChange={(e) => setName(e.target.value)}
      />
      <AuthField
        ref={emailRef}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        disabled={submitting}
        error={errors.email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <AuthField
        ref={passwordRef}
        label={`Password (${PASSWORD_MIN}–${PASSWORD_MAX} characters)`}
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        disabled={submitting}
        error={errors.password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" size="default" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
