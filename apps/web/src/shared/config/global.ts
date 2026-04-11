import { GlobalConfig } from '@/shared/types';

export enum Routes {
  Homepage = '/',
  About = '/about',
  Experience = '/experience',
  Projects = '/projects',
  Blogs = '/blogs',
  Contact = '/contact',
}

export const globalConfig: GlobalConfig = {
  header: {
    nav: [
      {
        title: 'home',
        href: Routes.Homepage,
        onlyMobile: true,
      },
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
        title: 'blogs',
        href: Routes.Blogs,
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
        title: 'blogs',
        href: Routes.Blogs,
      },
      {
        title: 'contact',
        href: Routes.Contact,
      },
    ],
  },
};
