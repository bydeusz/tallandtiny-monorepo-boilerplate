import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">Boilerplate Documentation</h1>
      <p className="text-fd-muted-foreground">
        Documentatie voor de tallandtiny monorepo-boilerplate.
      </p>
      <Link
        href="/docs"
        className="rounded-md bg-fd-primary px-4 py-2 text-fd-primary-foreground"
      >
        Open de docs
      </Link>
    </main>
  );
}
