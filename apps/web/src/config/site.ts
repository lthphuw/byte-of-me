import { SiteConfig } from '@/types';

import { host } from './host';

export const siteConfig: SiteConfig = {
  name: 'Byte of me',
  description:
    'Passion, experience, projects, hobbies — all logged, one byte at a time.',
  url: host,
  ogImage: `${host}/images/avatars/HaNot2024.jpeg`,
  links: {
    github: 'https://github.com/lthphuw',
  },
  email: process.env.NEXT_EMAIL || 'lthphuw@gmail.com',
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
    'MDX',
    'Contentlayer',
    'Next.js Starter',
    'Static Site',
    'i18n',
    'internationalization',
    'next-intl',

    // Hosting
    'Vercel',
  ],
};
