import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import {
  pickMessages,
  PRINT_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';
import { ForceLightTheme } from '@/shared/ui/force-light-theme';

/**
 * The print surface: no shell at all.
 *
 * `(protected)/layout.tsx` above still runs `requireAdmin`, so this is
 * guarded exactly like `/space` — it simply renders nothing around the
 * document. That is the whole reason it is a sibling of `space/` rather than
 * a route beneath it: `space/layout.tsx` draws the nav rail and
 * `space/notes/layout.tsx` draws the entire notes workspace, and a page whose
 * only job is to become a clean PDF must inherit neither.
 *
 * The provider carries `dashboard.note` alone. One client component renders
 * here (`NotePrintTrigger`, for its button label) and it reads nothing else —
 * nested providers REPLACE rather than merge, so this list has to be
 * self-sufficient, and there is no `error.tsx` under this route to widen it
 * for.
 *
 * Forced light: this page is measured in ink. A dark-mode PDF is either a
 * black rectangle or, once the browser drops backgrounds for print, white
 * text on white paper.
 */
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      messages={pickMessages(await getMessages(), PRINT_MESSAGE_NAMESPACES)}
    >
      {/* Two halves of the same job: the class removal below handles the
          Tailwind `dark:` VARIANTS the rich-text renderer uses, and
          `force-light-surface` pins the CSS custom properties so the page is
          light even in the frame before that effect runs. */}
      <ForceLightTheme />
      <main className="force-light-surface mx-auto max-w-[70ch] bg-background px-8 py-10 text-foreground print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </NextIntlClientProvider>
  );
}
