import { ReactNode } from 'react';

import { siteConfig } from '@/config/site';

import '@/styles/globals.css';
import { Viewport } from 'next';

import { host } from '@/config/config';
import '/node_modules/flag-icons/css/flag-icons.min.css';

export const metadata = {
  title: {
    default: "Lương Thanh Hoàng Phú",
    template: `%s | Phú`,
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

type Props = {
  children: ReactNode;
};
// export const metadata = {
//   title: {
//     default: 'Lương Thanh Hoàng Phú',
//     template: '%s | Phú',
//   },
//   description: 'The personal website and portfolio of Luong Thanh Hoang Phu – a fullstack developer passionate about backend systems, performance, and AI.'
// };

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({ children }: Props) {
  return children;
}
