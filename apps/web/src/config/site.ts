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
};
