import Link from 'next/link';

// Placeholder — implemented in Task 3 (Menu page) using GET /products.
export default function MenuPage() {
  return (
    <main className="section container-page">
      <h1 className="text-4xl font-bold">Menu</h1>
      <p className="mt-4 text-muted-foreground">The ordering menu is built in Sprint 1, Task 3.</p>
      <Link href="/" className="mt-6 inline-block underline">Back to home</Link>
    </main>
  );
}
