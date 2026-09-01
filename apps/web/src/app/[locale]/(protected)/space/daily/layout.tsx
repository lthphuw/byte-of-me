import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import {
  pickMessages,
  SPACE_DAILY_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';
import { SpaceNavTrigger } from '@/widgets/space/space-shell';

/**
 * One header, then the screen, plus this module's client message catalogue.
 * `overflow-x-clip`, never `overflow-hidden`: `hidden` makes this the nearest
 * scroll container and silently kills the day sheet's `position: sticky`.
 */
export default async function DailyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('dashboard.daily');

  // Self-sufficient, not additive: a nested provider REPLACES `messages`
  // rather than merging, so the shared floor is spread back in by the
  // constant. Without it the screens below render their own key paths.
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

      {/* The children ONLY. The header reads `dashboard.space`, so leaving
          it outside keeps this list a true statement of what daily reads. */}
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
