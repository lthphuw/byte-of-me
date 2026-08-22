'use client';

import { useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@byte-of-me/ui';
import { scrollIntoViewBehavior } from '@byte-of-me/ui/lib/prefers-reduced-motion';
import { List } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  useArticleHeadings,
  useArticleReferences,
} from '@/widgets/public/blog-details-content/lib/use-article-navigation';

const FLASH_CLASS = 'is-flash';
const FLASH_MS = 1600;

/**
 * Contents and References, below `xl`.
 *
 * A button in the corner rather than the sticky bar this replaces. That bar
 * sat at `top-24` over the article: it covered running text (a code block, in
 * the case that prompted this), it spent 42px of a phone screen on navigation
 * nobody had asked for yet, and it put the control at the top edge — the one
 * place a thumb cannot reach. It also had nowhere to put the bibliography, so
 * on a phone the only route to a reference was to scroll to the end of the
 * post.
 *
 * From `xl` the rail beside the article does this job and the button is gone.
 */
export function BlogReaderNav({
  targetId,
  contentsLabel,
  referencesLabel,
}: {
  targetId: string;
  contentsLabel: string;
  referencesLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { headings, activeId } = useArticleHeadings(targetId);
  const references = useArticleReferences(targetId);

  // Nothing worth a button: a short post with no bibliography.
  if (headings.length < 2 && references.length === 0) return null;

  const jumpTo = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    setOpen(false);
    element.scrollIntoView({ behavior: scrollIntoViewBehavior() });
    history.replaceState(null, '', `#${id}`);

    // The same landing highlight `BlogCitationLinks` gives a citation jump —
    // arriving mid-bibliography, the reader needs to see which entry it was.
    if (id.startsWith('ref-')) {
      element.classList.remove(FLASH_CLASS);
      void element.offsetWidth;
      element.classList.add(FLASH_CLASS);
      setTimeout(() => element.classList.remove(FLASH_CLASS), FLASH_MS);
    }
  };

  const hasBoth = headings.length >= 2 && references.length > 0;

  const contents = (
    <ul className="space-y-1 border-l border-border">
      {headings.map((heading) => (
        <li key={heading.id}>
          <button
            type="button"
            onClick={() => jumpTo(heading.id)}
            className={cn(
              '-ml-px block w-full border-l-2 border-transparent py-1.5 pr-2 text-left text-muted-foreground transition-colors hover:text-foreground',
              heading.level === 3 ? 'pl-6' : 'pl-3',
              activeId === heading.id &&
                'border-primary font-medium text-foreground'
            )}
          >
            {heading.text}
          </button>
        </li>
      ))}
    </ul>
  );

  const bibliography = (
    <ol className="space-y-1">
      {references.map((reference) => (
        <li key={reference.id}>
          <button
            type="button"
            onClick={() => jumpTo(reference.id)}
            className="flex w-full gap-2 rounded-md px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <span className="shrink-0 tabular-nums">[{reference.order}]</span>
            <span className="min-w-0 flex-1 break-words">{reference.text}</span>
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label={contentsLabel}
        onClick={() => setOpen(true)}
        // Bottom right, clear of the reading column and inside thumb reach.
        // `safe-area-inset` so it does not sit under the iOS home indicator.
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 h-11 w-11 rounded-full border shadow-lg xl:hidden"
      >
        <List className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-[min(20rem,85vw)] flex-col gap-0 p-0 xl:hidden"
        >
          {hasBoth ? (
            <Tabs
              defaultValue="contents"
              className="flex min-h-0 flex-1 flex-col"
            >
              <SheetTitle className="sr-only">{contentsLabel}</SheetTitle>
              <TabsList className="m-3 grid shrink-0 grid-cols-2">
                <TabsTrigger value="contents">{contentsLabel}</TabsTrigger>
                <TabsTrigger value="references">{referencesLabel}</TabsTrigger>
              </TabsList>
              <TabsContent
                value="contents"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 pb-8 text-sm"
              >
                {contents}
              </TabsContent>
              <TabsContent
                value="references"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-2 pb-8 text-sm"
              >
                {bibliography}
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <SheetTitle className="border-b px-4 py-3 text-sm font-semibold">
                {references.length ? referencesLabel : contentsLabel}
              </SheetTitle>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
                {references.length ? bibliography : contents}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
