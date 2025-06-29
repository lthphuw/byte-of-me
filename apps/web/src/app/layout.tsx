import { ReactNode } from 'react';

import { siteConfig } from '@/config/site';

import '@/styles/globals.css';
import { Viewport } from 'next';

import { host } from '@/config/config';

import '/node_modules/flag-icons/css/flag-icons.min.css';

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Lương Thanh Hoàng Phú',
    template: `%s | Phú`,
  },
  description: siteConfig.description,
  keywords: [
    'Next.js',
    'React',
    'Tailwind CSS',
    'Portfolio',
    'Fullstack',
    'Lương Thanh Hoàng Phú',
    'Byte of me',
  ],
  authors: [{ name: 'lthphuw', url: host }],
  creator: 'lthphuw',
  applicationName: 'Byte of me | Phú',
  generator: 'Next.js',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: ['/images/avatars/HaNoi2024.jpeg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: ['/images/avatars/HaNoi2024.jpeg'],
    creator: '@lthphuw',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
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

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({ children }: Props) {
  return children;
}
