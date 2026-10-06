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
 * Public, so it lives under `features/public` and reads `blogDetails` — never
 * the `dashboard` namespace, which would ship the CMS's whole vocabulary in a
 * visitor's RSC payload.
 *
 * Waiting on `document.fonts.ready` before printing lives in
 * `usePrintOnFontsReady`.
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
