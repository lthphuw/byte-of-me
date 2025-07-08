import { routing } from '@/i18n/routing';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Inter as FontSans } from 'next/font/google';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';

import { Analytics } from '@/components/analytics';
import { BackgroundWrapper } from '@/components/background-wrapper';
import { SpeedInsights } from '@/components/speed-insight';
import { TailwindIndicator } from '@/components/tailwind-indicator';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { host } from '@/config/host';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Font files can be colocated inside of `pages`
const fontHeading = localFont({
  src: '../../assets/fonts/CalSans-SemiBold.woff2',
  variable: '--font-heading',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const t = await getTranslations('metadata');
  const { locale } = await params;
  const url = `${host}/${locale}`;

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${t('title')} | Byte of me`,
      template: '%s | Byte of me',
    },
    description: t('description'),
    keywords: siteConfig.keywords,
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
        fr: `${siteConfig.url}/fr`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : locale === 'fr' ? 'fr_FR' : 'en_US',
      url: siteConfig.url,
      title: `${t('title')} | Byte of me`,
      description: t('description'),
      siteName: 'Byte of me',
      images: [`${siteConfig.url}/images/avatars/HaNoi2024.jpeg`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('title')} | Byte of me`,
      description: t('description'),
      images: [`${siteConfig.url}/images/avatars/HaNoi2024.jpeg`],
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
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <BackgroundWrapper />
            {children}
            <Analytics />
            <SpeedInsights />
            <Toaster />
            <TailwindIndicator />
            <GoogleAnalytics gaId={`${process.env.NEXT_PUBLIC_GA_ID}`} />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
