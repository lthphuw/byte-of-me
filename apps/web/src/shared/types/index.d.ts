// Global
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Any = any;
  type Nullable<T> = T | null;
  type Maybe<T> = T | null | undefined;
}

export type LocaleType = 'vi' | 'en';

export type NavItem = {
  title: string;
  href: string;
  disabled?: boolean;
};

export type MainNavItem = NavItem & {
  onlyMobile?: boolean;
};

export type SiteConfig = {
  name: string;
  shortName: string;
  description: string;
  email: string;
  url: string;
  ogImage: string;
  links: {
    github: string;
  };
  keywords: string[];
};

export type GlobalConfig = {
  header: {
    nav: MainNavItem[];
  };
  footer: {
    nav: MainNavItem[];
  };
};
