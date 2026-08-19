'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

/**
 * Paragraph-line widths. Ragged on purpose — equal-length bars read as a
 * table, not as prose — and the last one is short, the way a paragraph's
 * final line is.
 */
const LINE_WIDTHS = [
  'w-[96%]',
  'w-[88%]',
  'w-full',
  'w-[72%]',
  'w-[92%]',
  'w-[60%]',
];

/**
 * `NoteEditor`, loading. Mirrors that component's three bands — header bar,
 * title field, writing surface — with the same padding, so the real editor
 * swapping in shifts nothing. The loading state used to be a single line of
 * copy in a `p-6` box, which sat nowhere near where the document appears.
 */
export function NoteEditorSkeleton() {
  const t = useTranslations('dashboard.note');

  return (
    // `aria-busy` + a name on the container, matching `BlogFormSkeleton`:
    // the bars themselves are decorative and stay hidden. `loading` is the
    // key the old copy already used, so nothing new enters the catalogues.
    <div
      className="flex h-full min-h-0 flex-col"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {/* The back arrow, which the real header also renders below `md`
            only — on a desktop the tree is already on screen. */}
        <Skeleton aria-hidden className="size-9 shrink-0 md:hidden" />

        {/* The save-status line: `text-xs`, so a 16px line box. */}
        <div className="min-w-0 flex-1 px-1">
          <Skeleton aria-hidden className="h-4 w-16" />
        </div>

        {/* The editor ⇄ markdown pair. Its frame is reproduced rather than
            faked with a fixed height, so the 30px the border and `p-0.5`
            add to two `h-6` buttons comes out the same here. */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border p-0.5">
          <Skeleton aria-hidden className="h-6 w-14" />
          <Skeleton aria-hidden className="h-6 w-20" />
        </div>

        {/* Cheat sheet and export, both `size-7` icon buttons. */}
        <Skeleton aria-hidden className="size-7 shrink-0" />
        <Skeleton aria-hidden className="size-7 shrink-0" />
      </div>

      {/* The title field's own padding, and a bar the height of the line box
          `text-xl` / `md:text-2xl` gives it. */}
      <div className="shrink-0 px-4 pb-1 pt-3 md:px-6 md:pt-5">
        <Skeleton aria-hidden className="h-7 w-2/3 md:h-8" />
      </div>

      {/* `p-4 sm:p-6` is the writing column's padding inside the chromeless
          editor, not this component's invention — see `RichTextEditor`. */}
      <div className="min-h-0 flex-1 p-4 sm:p-6">
        {/* `h-4` bars on a `space-y-3` rhythm is a 28px pitch: the line
            height prose sets for body text. */}
        <div className="space-y-3">
          {LINE_WIDTHS.map((width) => (
            <Skeleton key={width} aria-hidden className={cn('h-4', width)} />
          ))}
        </div>
      </div>
    </div>
  );
}
