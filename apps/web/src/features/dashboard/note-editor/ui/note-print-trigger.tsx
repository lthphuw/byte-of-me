'use client';

import { Button } from '@byte-of-me/ui';
import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePrintOnFontsReady } from '@/shared/hooks/use-print-on-fonts-ready';

export interface NotePrintTriggerProps {
  /**
   * Open the print dialog automatically on load. Set only when the page was
   * opened FROM the export menu (`?print=1`), where the author has already
   * said what they want.
   *
   * Off by default, deliberately. `window.print()` is a native modal that
   * blocks the whole renderer: an unconditional one makes the URL impossible
   * to just look at — including for anyone debugging the print layout — and
   * leaves an author who cancels the dialog stranded on a bare page with no
   * way back to it short of a reload. The button below is that way back.
   */
  auto?: boolean;
}

/**
 * The print affordance for `/print/notes/[id]`.
 *
 * The auto-open waits on `document.fonts.ready` — see
 * `usePrintOnFontsReady` for why that wait is load-bearing rather than
 * cosmetic (§7, Phase C exit criteria).
 */
export function NotePrintTrigger({ auto = false }: NotePrintTriggerProps) {
  const t = useTranslations('dashboard.note');

  usePrintOnFontsReady(auto);

  return (
    // `print:hidden` — the control must not appear in its own output.
    <div className="mt-10 border-t pt-6 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="mr-2 size-4" />
        {t('export.pdf')}
      </Button>
    </div>
  );
}
