import { CSSProperties } from 'react';

import { Icons } from '@/components/icons';





export type LocaleType = 'vi' | 'en' | 'fr';
export type FlagType = LocaleType;

export type BaseSelectItem = {
  id: string;
  label: string;
};

export type NavItem = {
  title: string;
  href: string;
  disabled?: boolean;
};

export type MainNavItem = NavItem & {
  onlyMobile?: boolean;
};

export type SidebarNavItem = {
  title: string;
  disabled?: boolean;
  external?: boolean;
  icon?: keyof typeof Icons;
} & (
  | {
      href: string;
      items?: never;
    }
  | {
      href?: string;
      items: NavLink[];
    }
);

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

export type BaseComponentProps = {
  className?: string;
  style?: CSSProperties;
}
