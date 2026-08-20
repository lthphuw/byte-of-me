'use client';

import { Icons } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import type { NavDrawerGroup } from '@/shared/ui/nav-drawer';

/**
 * The single list the rail and the mobile drawer both render, lifted out of
 * `dashboard-sidebar.tsx` when the desktop side became an icon rail and the
 * two stopped sharing markup. They must not stop sharing DESTINATIONS: a page
 * added to one and forgotten in the other is reachable on a laptop and missing
 * on a phone, which is the kind of gap nobody notices until they are out.
 *
 * The group labels survive even though the rail draws them as nothing but a
 * hairline. They are what the drawer's `sr-only` headings announce, and what
 * gives the rail's separators something to be a separator BETWEEN.
 *
 * Labels are resolved with literal `t('items.x')` calls rather than a
 * `labelKey` field looked up dynamically — next-intl's generated declarations
 * only type-check literal keys, so a dynamic lookup would silently accept a
 * key that does not exist. Same reason `use-space-nav-items.ts` does it this
 * way.
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
