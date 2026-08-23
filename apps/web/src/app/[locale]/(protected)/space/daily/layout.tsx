import { getTranslations } from 'next-intl/server';

import { SpaceNavTrigger } from '@/widgets/space/space-shell';

/**
 * The module frame: one header, then the screen.
 *
 * `overflow-x-clip`, never `overflow-hidden` — `hidden` would make this the
 * nearest scroll container and silently kill the `position: sticky` the day
 * sheet's bars depend on. The page below owns its own scrolling, which is how
 * every other `/space` module works.
 *
 * No segmented control. That is the point of the split: this module has one
 * screen, so there is nothing for a second navigation layer to switch between.
 */
export default async function DailyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('dashboard.daily');

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <SpaceNavTrigger className="lg:hidden" />
        <h1 className="truncate text-sm font-semibold">{t('title')}</h1>
      </header>

      {children}
    </div>
  );
}
