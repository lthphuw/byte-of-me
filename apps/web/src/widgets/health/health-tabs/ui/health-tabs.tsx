'use client';

import { Activity, Dumbbell, type LucideIcon, Moon } from 'lucide-react';
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
 * The `gym` tab arrived with phase 2a, together with the surface behind it —
 * it was deliberately absent until then, because a tab that leads to a 404 is
 * worse than one that appears when its screen does.
 *
 * Gym owns THREE paths, not one. `/space/health/gym` is the screen, but the
 * routine editor lives under it and the exercise catalogue sits beside it at
 * `/space/health/exercises` — both are gym surfaces, and a reader standing on
 * either one has not left the module. `prefixes` exists for that: a tab is
 * current when the path starts with any of the routes it owns, so the catalogue
 * does not silently unmark every tab and leave the control saying nothing.
 */
export function HealthTabs() {
  const t = useTranslations('dashboard.health.tabs');
  const pathname = usePathname();

  // The glyphs are the module's own vocabulary, not new pictures: a moon
  // already means bed/sleep on the entry form and the bedtime-variation tile,
  // and a dumbbell already means a workout on the factor grid. A tab whose
  // icon disagrees with the icon on the screen it leads to is worse than no
  // icon at all. The label stays beside every one of them (§14) — these are
  // `aria-hidden` and the text is what names the destination.
  const tabs: {
    href: '/space/health' | '/space/health/sleep' | '/space/health/gym';
    label: string;
    icon: LucideIcon;
    /** Overview would otherwise match every path in the module. */
    exact?: boolean;
    /** Every route this tab stands for, when that is more than its own href. */
    prefixes?: string[];
  }[] = [
    {
      href: '/space/health',
      label: t('overview'),
      icon: Activity,
      exact: true,
    },
    { href: '/space/health/sleep', label: t('sleep'), icon: Moon },
    {
      href: '/space/health/gym',
      label: t('gym'),
      icon: Dumbbell,
      prefixes: ['/space/health/gym', '/space/health/exercises'],
    },
  ];

  return (
    <nav className="flex shrink-0 gap-2 border-b px-3 py-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? pathname === tab.href
          : (tab.prefixes ?? [tab.href]).some((prefix) =>
              pathname.startsWith(prefix)
            );

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              // A full pill rather than a 6px radius: the module is now a
              // page of 16–24px corners, and a squared-off tab above it reads
              // as belonging to a different screen.
              'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm',
              'transition-colors duration-200',
              // Fill AND weight AND text tone AND `aria-current` — §14's rule
              // that colour may not be the sole carrier of a state, and on an
              // achromatic palette there is no hue to lean on anyway. Same
              // three cues `SpaceNavRail` marks its current item with.
              isActive
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
