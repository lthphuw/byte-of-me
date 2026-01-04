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
        title: 'anythingAboutMe',
        href: Routes.Chat,
        onlyMobile: true,
      },
      {
        title: 'letsTalk',
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
        title: 'anythingAboutMe',
        href: Routes.Chat,
      },
    ],
  },
};
