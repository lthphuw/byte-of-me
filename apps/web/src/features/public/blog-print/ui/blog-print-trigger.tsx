'use client';

// The leaf package, not the `@byte-of-me/ui` facade: the print route must load
// no editor JavaScript, and this import has no path to it.
import { usePrintOnFontsReady } from '@byte-of-me/ui-hooks';
import { Button } from '@byte-of-me/ui-primitives';
import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BlogPrintTriggerProps {
  /**
   * Open the print dialog on load; set only from the article's action bar (`?print=1`).
   * Off by default: `window.print()` blocks the renderer, makes the URL impossible to just look at,
   * and strands a reader who cancels; the button below is the way back.
   */
  auto?: boolean;
}

/**
 * The print affordance for `/print/blogs/[slug]`. Public, so it reads `blogDetails`, never
 * `dashboard` (the CMS vocabulary would ship in a visitor's RSC payload). Waits on fonts via
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
