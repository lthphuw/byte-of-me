import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import {
  pickMessages,
  PUBLIC_PRINT_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';
import { ForceLightTheme } from '@/shared/ui/force-light-theme';

/**
 * PUBLIC print surface, no shell: sibling of `(public)` (header, footer, grid), outside `(protected)`.
 * Forced light twice: `force-light-surface` sets the variables, but only `ForceLightTheme` drops
 * the `.dark` class editor-surface.css keys on (else dark highlights print on white paper).
 */
export default async function PublicPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      messages={pickMessages(
        await getMessages(),
        PUBLIC_PRINT_MESSAGE_NAMESPACES
      )}
    >
      <ForceLightTheme />
      <main className="force-light-surface mx-auto max-w-[70ch] bg-background px-8 py-10 text-foreground print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </NextIntlClientProvider>
  );
}
