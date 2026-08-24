import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import {
  pickMessages,
  SPACE_DAILY_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';
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
 *
 * It is also where this module's client message catalogue is mounted. The
 * vault used to ship all four of its namespaces from `space/layout.tsx`; each
 * module now carries its own, which is what makes this file a layout worth
 * having beyond the header.
 */
export default async function DailyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('dashboard.daily');

  // This module's half of the vault catalogue. `space/layout.tsx` above
  // carries only the shell's copy, so without this the screens below would
  // render their own key paths — `pickMessages` skips what it cannot reach
  // and next-intl has no build-time view of which provider a component sits
  // under.
  //
  // Self-sufficient rather than additive: a nested provider REPLACES
  // `messages`, it does not merge with the one above, so the shared floor
  // (`components`, `error`, `global`) is spread back in by the constant.
  const messages = pickMessages(
    await getMessages(),
    SPACE_DAILY_MESSAGE_NAMESPACES
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <SpaceNavTrigger className="lg:hidden" />
        <h1 className="truncate text-sm font-semibold">{t('title')}</h1>
      </header>

      {/* Around the children ONLY, with the header left outside. The header
          is `SpaceNavTrigger` — shell chrome reading `dashboard.space`, not
          this module's vocabulary — so it keeps resolving against the shell's
          provider and this list stays a true statement of what daily reads.
          Move the header inside and the namespace has to come with it. */}
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
