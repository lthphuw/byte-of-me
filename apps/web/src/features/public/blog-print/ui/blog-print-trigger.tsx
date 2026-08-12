'use client';

// Subpath import, not the `@byte-of-me/ui` barrel: the barrel reaches the
// TipTap editor, and the whole point of the print route is that no editor
// JavaScript loads on it.
import { Button } from '@byte-of-me/ui/button';
import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePrintOnFontsReady } from '@/shared/hooks/use-print-on-fonts-ready';

export interface BlogPrintTriggerProps {
  /**
   * Open the print dialog automatically on load. Set only when the page was
   * opened from the article's action bar (`?print=1`), where the reader has
   * already said what they want.
   *
   * Off by default, deliberately. `window.print()` is a native modal that
   * blocks the whole renderer: an unconditional one makes the URL impossible
   * to just look at, and leaves a reader who cancels the dialog stranded on a
   * bare page with no way back to it short of a reload. The button below is
   * that way back.
   */
  auto?: boolean;
}

/**
 * The print affordance for `/print/blogs/[slug]`.
 *
 * A public counterpart to `NotePrintTrigger` rather than a reuse of it, for
 * two reasons that are not stylistic:
 *
 * 1. FSD. `features/dashboard/*` importing into a public route erases the
 *    audience grouping AGENTS.md §3 relies on — the one that makes "never
 *    expose dashboard functionality on a public route" visible in a directory
 *    listing instead of buried in a guard.
 * 2. Messages. `NotePrintTrigger` reads `dashboard.note.export.pdf`, so
 *    reusing it would mount the `dashboard` namespace on an anonymous page
 *    and ship the CMS's whole vocabulary in a visitor's RSC payload — exactly
 *    what `SHARE_MESSAGE_NAMESPACES` refuses to do for recipients.
 *
 * The behaviour they do share — waiting on `document.fonts.ready` before
 * printing — lives in `usePrintOnFontsReady` and is not duplicated.
 */
export function BlogPrintTrigger({ auto = false }: BlogPrintTriggerProps) {
  const t = useTranslations('blogDetails');

  usePrintOnFontsReady(auto);

  return (
    // `print:hidden` — the control must not appear in its own output.
    <div className="mt-10 border-t pt-6 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="mr-2 size-4" />
        {t('downloadPdf')}
      </Button>
    </div>
  );
}
