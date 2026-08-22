import { getTranslations } from 'next-intl/server';

import { HealthTabs } from '@/widgets/health/health-tabs';
import { SpaceNavTrigger } from '@/widgets/space/space-shell';

/**
 * The module frame: one header, one segmented control, and then whichever
 * screen the tabs point at.
 *
 * `overflow-x-clip`, never `overflow-hidden` — `hidden` would make this the
 * nearest scroll container and silently kill the `position: sticky` this
 * module's bottom bars depend on. Each page owns its own scrolling below the
 * tabs, which is how every other `/space` page works: the shell owns the
 * viewport height and nothing nests a second scroll container inside a page's.
 */
export default async function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('dashboard.health');

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <SpaceNavTrigger className="lg:hidden" />
        <h1 className="truncate text-sm font-semibold">{t('title')}</h1>
      </header>

      <HealthTabs />

      {children}
    </div>
  );
}
