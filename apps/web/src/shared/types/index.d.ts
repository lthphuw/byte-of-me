import { CSSProperties } from 'react';





// Global
declare global {
  type Nullable<T> = T | null;
  type Maybe<T> = T | null | undefined;
  type BaseComponentProps = {
    className?: string;
    style?: CSSProperties;
  }
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
