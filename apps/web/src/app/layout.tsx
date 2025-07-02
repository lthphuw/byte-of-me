import { Viewport } from 'next';
import { ReactNode } from 'react';

import { host } from '@/config/host';
import { siteConfig } from '@/config/site';

import '@/styles/globals.css';
import '../../node_modules/flag-icons/css/flag-icons.min.css';

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
    'TypeScript',
    'MDX',
    'Contentlayer',
    'Static Site',
    'Personal Website',
    'Portfolio',
    'Blog Template',
    'Frontend Developer',
    'Fullstack Developer',
    'Digital Garden',
    'Luong Thanh Hoang Phu',
    'Lương Thanh Hoàng Phú',
    'Byte of me',
    'Vercel',
    'Web Developer Portfolio',
    'Software Engineer',
    'Minimal Blog',
    'Developer Notes',
    'Next.js Starter',
    'Personal Blog Template',
    'Byte of me',
    'byte-of-me'
  ],
  authors: [{ name: 'lthphuw', url: host }],
  creator: 'lthphuw',
  applicationName: `${siteConfig.name} | Phú`,
  generator: 'Next.js',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: `${siteConfig.name} | Phú`,
    description: siteConfig.description,
    siteName: `${siteConfig.name} | Phú`,
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
