import { routing } from '@/i18n/routing';
import { ExperimentalProvider } from '@/providers/experimental';
import { GoogleAnalytics } from '@next/third-parties/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
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
import { Metadata, Viewport } from 'next';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Font files can be colocated inside of `pages`
const fontHeading = localFont({
  src: '../../assets/fonts/CalSans-SemiBold.woff2',
  variable: '--font-heading',
});

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = params.locale || 'vi';
  const url = `${host}/${locale}`;

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: 'Lương Thanh Hoàng Phú',
      template: '%s | Byte of me',
    },
    description: siteConfig.description,
    keywords: [
      // Myself
      'Byte of me',
      'byte-of-me',
      'Phú',
      'phu-lth',
      'Lương Thanh Hoàng Phú',
      'Luong Thanh Hoang Phu',
      'lthphuw',

      // Role
      'Frontend Developer',
      'Fullstack Developer',
      'Web Developer Portfolio',
      'Software Engineer',

      // Topic
      'Portfolio',
      'Personal Website',
      'Personal Blog Template',
      'Minimal Blog',
      'Digital Garden',
      'Developer Notes',
      'Blog Template',

      // Techstack
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind CSS',
      'Prisma ORM',
      'Supabase',
      'MDX',
      'Contentlayer',
      'Next.js Starter',
      'Static Site',

      // Hosting
      'Vercel',
    ],

    authors: [{ name: 'lthphuw', url: host }],
    creator: 'lthphuw',
    applicationName: `${siteConfig.name} | Phú`,
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
      locale: 'en_US',
      url: siteConfig.url,
      title: `${siteConfig.name} | Byte of me`,
      description: siteConfig.description,
      siteName: `${siteConfig.name} | Byte of me`,
      images: [`${siteConfig.url}/images/avatars/HaNoi2024.jpeg`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteConfig.name} | Byte of me`,
      description: siteConfig.description,
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
              <GoogleAnalytics gaId={`${process.env.NEXT_PUBLIC_GA_ID}`} />
            </ThemeProvider>
          </NextIntlClientProvider>
        </ExperimentalProvider>
      </body>
    </html>
  );
}
