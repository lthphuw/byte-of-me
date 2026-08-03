'use client';

import type { ComponentType } from 'react';
import { NotebookPen } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface SpaceNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

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
export function useSpaceNavItems(): SpaceNavItem[] {
  const t = useTranslations('dashboard.space');

  return [
    { href: '/space/notes', label: t('items.notes'), icon: NotebookPen },
  ];
}
