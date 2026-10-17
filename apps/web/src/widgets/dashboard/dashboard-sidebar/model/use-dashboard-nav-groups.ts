'use client';

import { Icons } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import type { NavDrawerGroup } from '@/shared/ui/nav-drawer';

/**
 * The one list the rail and the mobile drawer both render, so no page is missing from either.
 * Group labels stay though the rail draws a hairline: the drawer's `sr-only` headings need them.
 * Literal `t('items.x')` keys, not a dynamic `labelKey`: next-intl only type-checks literal keys.
 */
export function useDashboardNavGroups(): NavDrawerGroup[] {
  const t = useTranslations('dashboard.sidebar');

  return [
    {
      label: t('groups.overview'),
      items: [
        {
          href: '/dashboard',
          label: t('items.dashboard'),
          icon: Icons.dashboard,
          // The only entry that needs it: `/dashboard` is a prefix of every
          // other route here, so prefix matching would light it permanently.
          exact: true,
        },
        {
          href: '/dashboard/user-profile',
          label: t('items.profile'),
          icon: Icons.userCircle,
        },
      ],
    },
    {
      label: t('groups.portfolio'),
      items: [
        {
          href: '/dashboard/projects',
          label: t('items.projects'),
          icon: Icons.projects,
        },
        {
          href: '/dashboard/featured-works',
          label: t('items.featuredWorks'),
          icon: Icons.sparkles,
        },
        {
          href: '/dashboard/blogs',
          label: t('items.blogs'),
          icon: Icons.blogs,
        },
        {
          href: '/dashboard/comments',
          label: t('items.comments'),
          icon: Icons.comments,
        },
        {
          href: '/dashboard/media',
          label: t('items.media'),
          icon: Icons.media,
        },
      ],
    },
    {
      label: t('groups.resume'),
      items: [
        {
          href: '/dashboard/companies',
          label: t('items.companies'),
          icon: Icons.companies,
        },
        {
          href: '/dashboard/educations',
          label: t('items.education'),
          icon: Icons.education,
        },
        {
          href: '/dashboard/tech-stacks',
          label: t('items.techStacks'),
          icon: Icons.techStacks,
        },
      ],
    },
    {
      label: t('groups.configuration'),
      items: [
        { href: '/dashboard/tags', label: t('items.tags'), icon: Icons.tags },
      ],
    },
  ];
}
