import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { RegisterForm } from '@/components/auth/register-form';
import { safeNextPath } from '@/lib/safe-next-path';

export default function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNextPath(searchParams.next);
  return (
    <>
      <Navbar />
      <main className="section container-page">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-bold md:text-5xl">Create account</h1>
          <RegisterForm next={next} />
          <p className="mt-8 text-sm">
            Already have an account?{' '}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline hover:text-accent">
              Log in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
