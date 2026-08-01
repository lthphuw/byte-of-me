'use client';

import type { ComponentType } from 'react';
import { Badge } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  soon?: boolean;
}

export function DashboardNavItems({
  items,
  onItemClick,
}: {
  items: DashboardNavItem[];
  onItemClick?: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations('dashboard.common');

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onItemClick}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.soon && (
                <Badge variant="secondary" className="ml-auto">
                  {t('nav.soonBadge')}
                </Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
