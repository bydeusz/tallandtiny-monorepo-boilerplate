import Link from 'next/link';

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const nl = lang === 'nl';
  const docsHref = nl ? '/nl/docs' : '/docs';
  const title = nl ? 'Boilerplate-documentatie' : 'Boilerplate Documentation';
  const subtitle = nl
    ? 'Documentatie voor de tallandtiny monorepo-boilerplate.'
    : 'Documentation for the tallandtiny monorepo boilerplate.';
  const cta = nl ? 'Open de docs' : 'Open the docs';

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-fd-muted-foreground">{subtitle}</p>
      <Link
        href={docsHref}
        className="rounded-md bg-fd-primary px-4 py-2 text-fd-primary-foreground"
      >
        {cta}
      </Link>
    </main>
  );
}
