// Global
declare global {
  type Nullable<T> = T | null;
  type Maybe<T> = T | null | undefined;
}

export type LocaleType = 'vi' | 'en';

export type MainNavItem = {
  title: string;
  href: string;
  disabled?: boolean;
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
