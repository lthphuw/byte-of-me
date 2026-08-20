'use client';

import { Skeleton } from '@byte-of-me/ui';

import { ATTACHMENT_ROW_CLASS } from './attachment-row-shell';

import { cn } from '@/shared/lib/utils';

/**
 * Title-bar widths, cycled by row index. Identical bars read as a striped
 * block; real file names are all different lengths, so the placeholder has to
 * be too or it stops looking like a list of documents. Same reasoning
 * `NoteLinksSkeleton` records.
 */
const TITLE_WIDTHS = ['w-[62%]', 'w-[80%]', 'w-[48%]'];

function AttachmentRowSkeleton({ index }: { index: number }) {
  return (
    <div aria-hidden className={ATTACHMENT_ROW_CLASS}>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
        {/* The `FileText` glyph. */}
        <Skeleton className="size-4 shrink-0" />

        <span className="min-w-0 flex-1 space-y-1">
          {/* `h-5` and `h-4` are the line boxes `text-sm` and `text-xs` give
              the real two lines; the bars inside are thinner than their lines,
              the way a glyph is. Without the line boxes the row collapses
              below the 44px the loaded row keeps and the list jumps when the
              attachments arrive. */}
          <span className="flex h-5 items-center">
            <Skeleton
              className={cn('h-3.5', TITLE_WIDTHS[index % TITLE_WIDTHS.length])}
            />
          </span>
          <span className="flex h-4 items-center">
            <Skeleton className="h-3 w-24" />
          </span>
        </span>
      </div>

      {/* The `⋮` trigger's column, left empty rather than filled: a bar here
          would promise an affordance that belongs to a file which does not
          exist yet. 44px, the width the real button paints. */}
      <div className="size-11 shrink-0" />
    </div>
  );
}

/**
 * `NoteAttachmentsPanel`, loading.
 *
 * Three rows and nothing else — the drop zone below the list is NOT drawn as a
 * placeholder because the real panel keeps it visible in every state, loading
 * included. Standing in for something already on screen would double it.
 */
export function NoteAttachmentsSkeleton() {
  return (
    <div>
      <AttachmentRowSkeleton index={0} />
      <AttachmentRowSkeleton index={1} />
      <AttachmentRowSkeleton index={2} />
    </div>
  );
}
