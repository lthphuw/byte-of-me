'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/**
 * The health module's sub-navigation.
 *
 * A segmented control under the existing header rather than a bottom tab bar:
 * `/space` already has one navigation system (the rail above `lg`,
 * `SpaceNavTrigger` in each page's header below it), and a second one scoped to
 * this module would leave a phone with two.
 *
 * 44px tall — the minimum comfortable touch target, and this is a phone-first
 * surface.
 *
 * There is no `gym` tab. It arrives with phase 2a, together with the surface
 * behind it: a tab that leads to a 404 is worse than one that appears when its
 * screen does.
 */
export function HealthTabs() {
  const t = useTranslations('dashboard.health.tabs');
  const pathname = usePathname();

  const tabs = [
    { href: '/space/health', label: t('overview'), exact: true },
    { href: '/space/health/sleep', label: t('sleep') },
  ];

  return (
    <nav className="flex shrink-0 gap-1 border-b px-3 py-1.5">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex h-11 flex-1 items-center justify-center rounded-md text-sm transition-colors',
              isActive
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
