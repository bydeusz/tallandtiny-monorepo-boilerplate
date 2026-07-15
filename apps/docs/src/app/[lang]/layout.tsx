import '../globals.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import type { ReactNode } from 'react';
import { i18n } from '@/lib/i18n';
import { translations } from '@/lib/translations';

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  return (
    <html
      lang={lang}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider i18n={i18nProvider(translations, lang)}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
