import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Inter as FontSans } from 'next/font/google';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { hasLocale,NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';

import { GlobalProvider } from '@/app/providers/global-provider';
import { routing } from '@/i18n/routing';
import { host } from '@/shared/config/host';
import { siteConfig } from '@/shared/config/site';
import { cn } from '@/shared/lib/utils';





const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
  preload: true,
});

const fontHeading = localFont({
  src: '../assets/fonts/CalSans-SemiBold.woff2',
  variable: '--font-heading',
  preload: true,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations('metadata');
  const url = `${host}/${locale}`;

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${t('title')} | Byte of me`,
      template: '%s | Byte of me',
    },
    description: t('description'),
    keywords: siteConfig.keywords.map((key) => key.toLowerCase()),
    authors: [{ name: 'lthphuw', url: host }],
    creator: 'lthphuw',
    applicationName: `${t('title')} | Byte of me`,
    generator: 'Next.js',
    manifest: '/site.webmanifest',
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi`,
        en: `${siteConfig.url}/en`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      url: siteConfig.url,
      title: `${t('title')} | Byte of me`,
      description: t('description'),
      siteName: 'Byte of me',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('title')} | Byte of me`,
      description: t('description'),
      creator: '@lthphuw',
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
      },
    },
    category: 'technology',
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          'relative min-h-screen bg-transparent font-sans antialiased',
          fontSans.variable,
          fontHeading.variable
        )}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GlobalProvider>{children}</GlobalProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
