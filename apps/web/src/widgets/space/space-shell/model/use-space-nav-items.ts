'use client';

import { HeartPulse, LayoutGrid, NotebookPen, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NavDrawerItem } from '@/shared/ui/nav-drawer';

/**
 * The single list the rail and the mobile drawer both render. Adding a future
 * space page (schedule, gym log) is one entry here and one `items.*` key in
 * both message files — nothing else in the shell needs to change.
 *
 * The labels are resolved with literal `t('items.x')` calls rather than a
 * `labelKey` field looked up dynamically: next-intl's generated declarations
 * only type-check literal keys, so a dynamic lookup would silently accept a
 * key that does not exist. Same reason `dashboard-sidebar.tsx` builds its
 * groups inline.
 */
export function useSpaceNavItems(): NavDrawerItem[] {
  const t = useTranslations('dashboard.space');

  return [
    { href: '/space', label: t('items.hub'), icon: LayoutGrid, exact: true },
    { href: '/space/notes', label: t('items.notes'), icon: NotebookPen },
    { href: '/space/graph', label: t('items.graph'), icon: Share2 },
    { href: '/space/health', label: t('items.health'), icon: HeartPulse },
  ];
}
