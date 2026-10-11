import { host } from './host';

import type { SiteConfig } from '@/shared/types';

export const siteConfig: SiteConfig = {
  name: 'Byte of me',
  shortName: 'Phu',
  description:
    'Fullstack developer working on computer vision and the web apps around it.',
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
    'phu-lth',
    'lthphuw',
    'Lương Thanh Hoàng Phú',
    'Phú Lương',
    'Phu Luong',
    'Phu Luong Thanh Hoang',

    // Role
    'Fullstack Developer',
    'Computer Vision',

    // Topic
    'Portfolio',
    'Personal Blog',
    'Developer Notes',
    'Projects',
    'Thị giác máy tính',
    'Lập trình web',

    // Techstack
    'TypeScript',
    'JavaScript',
    'React',
    'Next.js',
    'Tailwind CSS',
    'Prisma',
    'PostgreSQL',
    'Python',
    'FastAPI',
    'Go',
    'Docker',

    // i18n
    'i18n',
    'next-intl',
    'Bilingual',
  ],
};
