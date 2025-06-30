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
import { cn } from '@/lib/utils';

import { SpeedInsights } from '@/components/speed-insight';


const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Font files can be colocated inside of `pages`
const fontHeading = localFont({
  src: '../../assets/fonts/CalSans-SemiBold.woff2',
  variable: '--font-heading',
});

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
