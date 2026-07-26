import { host } from './host';

import type { SiteConfig } from '@/shared/types';

export const siteConfig: SiteConfig = {
  name: 'Byte of me',
  shortName: 'Phu',
  description:
    'Passion, experience, projects, hobbies — all logged, one byte at a time.',
  url: host,
  // The `/api/og` route renders a 1200x630 card and takes an optional
  // `?title=`. Pointing the default here means the generator is the single
  // source of social preview images instead of sitting unreferenced.
  ogImage: `${host}/api/og`,
  links: {
    github: 'https://github.com/lthphuw',
  },
  email: process.env.NEXT_PUBLIC_AUTHOR_EMAIL || 'lthphuw@gmail.com',
  keywords: [
    // Myself
    'Byte of me',
    'byte-of-me',
    'hoang phu',
    'Phu',
    'Phú',
    'phu-lth',
    'phulth',
    'Phu Luong Thanh Hoang',
    'Phu - Luong Thanh Hoang',
    'Phú Lương',
    'Phu Luong',
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
    'Open Source Portfolio',
    'Next.js Personal Website',
    'Developer Portfolio with Blog',

    // Techstack
    'Next.js',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Prisma ORM',
    'Supabase',
    'Next.js Starter',
    'i18n',
    'internationalization',
    'next-intl',

    // Hosting
    'Vercel',
  ],
};
