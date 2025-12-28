import { GlobalConfig } from '@/types';

export enum Routes {
  Homepage = '/',
  About = '/about',
  Experience = '/experience',
  Projects = '/projects',
  Chat = '/ask-me',
  Contact = '/contact',
}

export const globalConfig: GlobalConfig = {
  header: {
    nav: [
      {
        title: 'About',
        href: Routes.About,
      },
      {
        title: 'Experience',
        href: Routes.Experience,
      },
      {
        title: 'Projects',
        href: Routes.Projects,
      },
      {
        title: 'Anything about me',
        href: Routes.Chat,
        onlyMobile: true,
      },
      {
        title: "Let's talk",
        href: Routes.Contact,
      },
    ],
  },
  footer: {
    nav: [
      {
        title: 'about',
        href: Routes.About,
      },
      {
        title: 'experience',
        href: Routes.Experience,
      },
      {
        title: 'projects',
        href: Routes.Projects,
      },
      {
        title: 'contact',
        href: Routes.Contact,
      },
      {
        title: 'Anything about me',
        href: Routes.Chat,
      },
    ],
  },
};
