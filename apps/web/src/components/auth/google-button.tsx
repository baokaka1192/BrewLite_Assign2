'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { GOOGLE_CLIENT_ID, loginWithGoogle } from '@/lib/google-auth';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const MAX_WIDTH = 360;

let gsiPromise: Promise<void> | null = null;

/** Injects the Google Identity Services script once per page load. */
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        gsiPromise = null;
        reject(new Error('Failed to load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

/**
 * "or" divider plus the Google sign-in button. Renders nothing when
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset, so the forms stay unchanged.
 */
export function GoogleSignIn({ next }: { next: string }) {
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <>
      <div className="flex items-center gap-4 text-sm text-muted-foreground" role="separator">
        <span className="h-px flex-1 bg-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton next={next} />
    </>
  );
}

function GoogleButton({ next }: { next: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef(next);
  const busyRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  useEffect(() => {
    let cancelled = false;

    async function onCredential(idToken: string) {
      if (busyRef.current) return;
      busyRef.current = true;
      setSubmitting(true);
      setServerError(null);
      try {
        await loginWithGoogle(idToken);
        router.replace(nextRef.current);
      } catch (err) {
        setServerError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
        setSubmitting(false);
        busyRef.current = false;
      }
    }

    loadGsi()
      .then(() => {
        const container = containerRef.current;
        const gsi = window.google?.accounts.id;
        if (cancelled || !container || !gsi) return;
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => void onCredential(response.credential),
        });
        gsi.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.min(MAX_WIDTH, container.offsetWidth || MAX_WIDTH),
        });
      })
      .catch(() => {
        if (!cancelled) setServerError('Could not load Google sign-in. Please try again.');
      });

    return () => {
      cancelled = true;
    };
    // Initialize Google Sign-In button once on mount; router is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-3" aria-busy={submitting}>
      {serverError && (
        <p role="alert" className="w-full rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {serverError}
        </p>
      )}
      <div ref={containerRef} className="flex w-full max-w-[360px] justify-center" />
      {submitting && <p className="text-sm text-muted-foreground">Signing in with Google…</p>}
    </div>
  );
}
