import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { LoginForm } from '@/components/auth/login-form';
import { safeNextPath } from '@/lib/safe-next-path';

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNextPath(searchParams.next);
  return (
    <>
      <Navbar />
      <main className="section container-page">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-bold md:text-5xl">Log in</h1>
          <LoginForm next={next} />
          <p className="mt-8 text-sm">
            New here?{' '}
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="underline hover:text-accent">
              Create an account
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
