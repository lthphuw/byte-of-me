'use client';

import { Button } from '@byte-of-me/ui';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  noteDocumentHref,
  type NoteDocumentSummary,
} from '@/entities/note-document';
import { cn } from '@/shared/lib/utils';

export interface NoteDocumentViewerProps {
  /**
   * Every attachment on the note, in the order the panel lists them — what
   * prev/next step through. Passing the list rather than two callbacks keeps
   * the index arithmetic in one place instead of in each container.
   */
  documents: NoteDocumentSummary[];
  /** The one being read. */
  activeId: string;
  /** Step to another one. */
  onSelect: (documentId: string) => void;
  onClose: () => void;
  className?: string;
}

/** 44px, and `min-*` because `size-11` cannot displace the icon variant's own
 *  `h-9 w-9` under the tailwind-merge 1.x this repo pins — see
 *  `attachment-row.tsx`. */
const ICON_BUTTON_CLASS = 'min-h-11 min-w-11 shrink-0';

/**
 * A PDF, read in place.
 *
 * Deliberately unaware of where it is. Below `lg` the widget mounts it in a
 * full-screen dialog and above `lg` in a split pane, so this is a plain
 * component that fills its parent and the container decides the rest — the
 * alternative, a `variant` prop, would put two layouts in a component whose
 * whole job is the header and the frame.
 *
 * The header's escape hatches are ALWAYS visible, and on a narrow viewport
 * they come first. That is not decoration: iOS Safari renders a PDF in an
 * iframe as a single non-scrolling page, so on the very viewport where the
 * dialog is used the frame below may show one page and refuse to move. "Open
 * in a new tab" and "Download" are the product on that device, and the caption
 * under the frame says so rather than leaving the reader to conclude the file
 * is broken.
 */
export function NoteDocumentViewer({
  documents,
  activeId,
  onSelect,
  onClose,
  className,
}: NoteDocumentViewerProps) {
  const t = useTranslations('dashboard.note.attachments');

  const index = documents.findIndex((entry) => entry.id === activeId);
  const active = index === -1 ? undefined : documents[index];

  // The attachment was deleted (or the note switched) while it was open. The
  // container decides what to do about that; the viewer only refuses to render
  // a frame pointed at nothing, which would otherwise paint the route's 404.
  if (!active) {
    return (
      <div
        className={cn(
          'flex h-full items-center justify-center p-6 text-sm text-muted-foreground',
          className
        )}
      >
        {t('errors.load')}
      </div>
    );
  }

  const href = noteDocumentHref(active.id);
  const previous = documents[index - 1];
  const next = documents[index + 1];

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <header className="flex shrink-0 flex-wrap items-center gap-1 border-b p-1.5">
        {/* `basis-full` under `sm` puts the title on its own line BELOW the
            controls (`order-2`), so the escape hatches are the first thing on
            a phone. From `sm` up it is a normal leading title again. */}
        <div className="order-2 min-w-0 flex-1 basis-full px-1 sm:order-1 sm:basis-auto">
          <p className="truncate text-sm font-medium" title={active.title}>
            {active.title}
          </p>
        </div>

        <div className="order-1 flex shrink-0 items-center gap-1 sm:order-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('prev')}
            disabled={!previous}
            onClick={() => previous && onSelect(previous.id)}
            className={ICON_BUTTON_CLASS}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('next')}
            disabled={!next}
            onClick={() => next && onSelect(next.id)}
            className={ICON_BUTTON_CLASS}
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t('openNewTab')}
            className={ICON_BUTTON_CLASS}
          >
            {/* `rel="noreferrer"`: the route is behind `requireAdmin`, and a
                tab opened with an opener still hands a reference back. */}
            <a href={href} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t('download')}
            className={ICON_BUTTON_CLASS}
          >
            {/* The route answers `Content-Disposition: inline` so the frame
                below can read it in place; `download` is what turns the same
                URL into a save. Same-origin, so the attribute holds. */}
            <a href={href} download={active.title}>
              <Download className="size-4" />
            </a>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('close')}
            onClick={onClose}
            className={ICON_BUTTON_CLASS}
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>

      {/* `key`, so stepping to the next attachment replaces the frame instead
          of asking the browser's PDF plugin to swap documents inside a live
          one — which leaves the previous scroll position and, in Chrome,
          occasionally the previous document. */}
      <iframe
        key={active.id}
        src={href}
        title={active.title}
        className="min-h-0 w-full flex-1 border-0 bg-muted/30"
      />

      <p className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">
        {t('viewerFallback')}
      </p>
    </div>
  );
}
