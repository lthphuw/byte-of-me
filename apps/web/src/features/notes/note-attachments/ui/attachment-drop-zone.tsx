'use client';

import type { DragEvent, ReactNode } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  documentFilesFrom,
  isAcceptedDocument,
} from '@/entities/note-document';
import { useAttachDocuments } from '@/features/notes/note-attachments/lib/use-attach-documents';
import { useDragDepth } from '@/features/notes/note-attachments/lib/use-drag-depth';
import { cn } from '@/shared/lib/utils';

export interface AttachmentDropZoneProps {
  /** The note a dropped PDF is attached to. */
  noteId: string;
  /** The editor region this wraps. */
  children: ReactNode;
  className?: string;
}

/**
 * True when the drag CURRENTLY over us is carrying at least one PDF.
 *
 * Read off `items`, never off `files`: during `dragover` (and `dragenter`)
 * `dataTransfer.files` is empty in every browser — the page is not allowed to
 * see the bytes, or even the names, until the author commits to the drop. What
 * IS exposed is a parallel `items` list carrying the kind and the MIME type of
 * each entry, which is exactly enough to decide whether this drag is ours.
 *
 * A browser that reports an empty `type` here simply gets no overlay; the drop
 * itself still reads the real files and is claimed on their strength.
 */
function hasDocumentItem(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.items).some(
    (item) => item.kind === 'file' && isAcceptedDocument(item.type)
  );
}

/**
 * Lets a PDF be dropped anywhere on the editor without `packages/ui` knowing.
 *
 * ProseMirror installs its own `drop` listener on the editor DOM node and
 * handles images there. Rather than teach it about attachments — a change to
 * the shared editor package, inherited by every other surface that renders one
 * — this wrapper claims the event in the CAPTURE phase. Capture runs from the
 * document down, so a handler on this ancestor fires BEFORE the editor's own
 * listener, and `stopPropagation()` there means the editor never sees the
 * event at all.
 *
 * The claim is conditional, and that condition is the whole contract with the
 * editor: a drag carrying no PDF is not touched — no `preventDefault`, no
 * `stopPropagation` — so an image drop reaches ProseMirror exactly as it does
 * today. A mixed drop is claimed whole, its PDFs attached and every other file
 * named in a toast, because a drop that half-worked in silence is worse than
 * one that loudly did less than the author asked.
 */
export function AttachmentDropZone({
  noteId,
  children,
  className,
}: AttachmentDropZoneProps) {
  const t = useTranslations('dashboard.note.attachments');
  const { attach, isPending } = useAttachDocuments(noteId);
  const { isDragging, enter, leave, reset } = useDragDepth();

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDocumentItem(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    enter();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDocumentItem(event.dataTransfer)) return;
    // Both are required, for different reasons: `preventDefault` is what makes
    // this a valid drop target at all (without it the browser refuses the drop
    // and opens the PDF as a page), and `stopPropagation` is what keeps
    // ProseMirror from painting its own insertion caret under the pointer.
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = () => {
    // Deliberately UNconditional, where enter is not: only a PDF drag ever
    // increments, so a stray leave lands on a depth of zero and is clamped —
    // whereas asking `hasDocumentItem` again here would leave the overlay
    // stuck forever on any browser that empties `items` on the way out.
    leave();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    // `files`, not `items`, from here on: this is the first moment the real
    // files exist. If none of them is a PDF the event is left completely
    // alone — that is an image drop, and it belongs to the editor.
    if (documentFilesFrom(event.dataTransfer.files).length === 0) {
      reset();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    // A drop fires no `dragleave`, so the overlay has to be taken down here or
    // it stays up over the file it just accepted.
    reset();
    attach(event.dataTransfer.files);
  };

  return (
    <div
      className={cn('relative', className)}
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
    >
      {children}

      {isDragging && (
        // `pointer-events-none`: an overlay that took the pointer would become
        // the drop target itself, and every enter/leave the counter is meant
        // to balance would fire against a different element.
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-md border-2 border-dashed border-foreground/40 bg-background/80"
        >
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileUp className="size-4" />
            {t('dropActive')}
          </p>
        </div>
      )}

      {isPending && (
        // The panel shows a row per file in flight — but only for files the
        // panel itself accepted, and this zone covers the whole editor, which
        // on a narrow screen is the only thing on it. Without this a drop here
        // showed nothing at all until the upload landed.
        <p
          role="status"
          className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm"
        >
          <Loader2 className="size-3.5 animate-spin" />
          {t('uploading')}
        </p>
      )}
    </div>
  );
}
