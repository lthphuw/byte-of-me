import { getTranslations } from 'next-intl/server';

import { SpaceNavTrigger } from '@/widgets/space/space-shell';

/**
 * The module frame: one header, then the screen.
 *
 * `overflow-x-clip`, never `overflow-hidden` — `hidden` would make this the
 * nearest scroll container for any `position: sticky` descendant a future
 * screen adds here, and silently break it. The page below owns its own
 * scrolling, which is how every other `/space` module works.
 *
 * No segmented control. Gym navigates itself from cards on its own screen —
 * sessions, routines, stats and the exercise catalogue are all one click away
 * from the gym home, so there is nothing for a second navigation layer to add.
 */
export default async function GymLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('dashboard.gym');

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
