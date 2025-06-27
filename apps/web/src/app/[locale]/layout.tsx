import { routing } from '@/i18n/routing';
import { ExperimentalProvider } from '@/providers/experimental';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { Inter as FontSans } from 'next/font/google';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';

import { Analytics } from '@/components/analytics';
import { BackgroundWrapper } from '@/components/background-wrapper';
import { TailwindIndicator } from '@/components/tailwind-indicator';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

import '@/styles/globals.css';
import '@/styles/liquid-glass.css';
import { Viewport } from 'next';

import '/node_modules/flag-icons/css/flag-icons.min.css';
import { SpeedInsights } from '@/components/speed-insight';
import { host } from '@/config/config';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Font files can be colocated inside of `pages`
const fontHeading = localFont({
  src: '../../assets/fonts/CalSans-SemiBold.woff2',
  variable: '--font-heading',
});

export const metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'Next.js',
    'React',
    'Tailwind CSS',
    'Server Components',
    'Radix UI',
  ],
  authors: [
    {
      name: 'lthphuw',
      url: host,
    },
  ],
  creator: 'lthphuw',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [`${siteConfig.url}/og.jpeg`],
    creator: '@lthphuw',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: `${siteConfig.url}/site.webmanifest`,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};
export default async function RootLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'min-h-screen bg-transparent font-sans antialiased',
          fontSans.variable,
          fontHeading.variable
        )}
      >
        <ExperimentalProvider>
          <NextIntlClientProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <BackgroundWrapper />
              {children}
              <Analytics />
              <SpeedInsights />
              <Toaster />
              <TailwindIndicator />
            </ThemeProvider>
          </NextIntlClientProvider>
        </ExperimentalProvider>
      </body>
    </html>
  );
}
