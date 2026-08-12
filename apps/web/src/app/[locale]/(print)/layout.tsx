import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import {
  pickMessages,
  PUBLIC_PRINT_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';
import { ForceLightTheme } from '@/shared/ui/force-light-theme';

/**
 * The PUBLIC print surface: no shell at all.
 *
 * A sibling of `(public)` rather than a route inside it, because
 * `(public)/layout.tsx` draws the site header, the footer and the container
 * grid, and a page whose only job is to become a clean PDF must inherit none
 * of it. It is equally NOT a sibling of `(protected)/print/notes/[id]`: that
 * route is guarded by `(protected)/layout.tsx` and must stay there, so this
 * group reuses the *mechanism* (server-rendered `RichText`, `MathRenderer`,
 * Chrome's "Save as PDF" driven by the `@media print` rules in `globals.css`)
 * and none of the route.
 *
 * Forced light, both halves of it — and the blog view needs both at least as
 * much as the note view does, because `RichTextHtml` styles the article body
 * with Tailwind `dark:` VARIANTS (`dark:prose-invert`,
 * `dark:text-neutral-200`, `dark:[&_a]:text-neutral-50`):
 *
 * - `force-light-surface` redeclares the CSS custom properties so the subtree
 *   is light even in the frame before the effect below runs, but a subtree
 *   cannot override a `.dark &` SELECTOR;
 * - `ForceLightTheme` drops the class those selectors key on.
 *
 * With only the first, a reader in dark mode exports white headings and bold
 * runs onto white paper. Paper has no dark mode.
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
