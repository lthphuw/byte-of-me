'use client';

import { CalendarHeart, Dumbbell, LayoutGrid, NotebookPen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NavDrawerItem } from '@/shared/ui/nav-drawer';

/**
 * The single list the rail and the mobile drawer both render — the hub, plus
 * one entry per MODULE. Adding a future space module (schedule, habits) is
 * one entry here and one `items.*` key in both message files; nothing else in
 * the shell needs to change.
 *
 * A module, and not a view of one. The knowledge graph was an entry here for
 * a while, which put a second way of looking at the notes on the same footing
 * as Notes and Health — two whole modules — and left the rail claiming three
 * products where there were two. It moved to `/space/notes/graph`, reached
 * from the switch in the notes workspace's own header. The test for a new
 * entry is whether it owns its own data; if it renders somebody else's, it
 * belongs inside them.
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
    { href: '/space/daily', label: t('items.daily'), icon: CalendarHeart },
    { href: '/space/gym', label: t('items.gym'), icon: Dumbbell },
  ];
}
