'use client';

import { useRef } from 'react';
import { Button } from '@byte-of-me/ui';
import { Paperclip } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AttachmentRow, PendingAttachmentRow } from './attachment-row';
import { NoteAttachmentsSkeleton } from './note-attachments-skeleton';

import {
  ACCEPTED_DOCUMENT_MIME_TYPES,
  useNoteDocuments,
} from '@/entities/note-document';
import { useAttachDocuments } from '@/features/notes/note-attachments/lib/use-attach-documents';
import { useDragDepth } from '@/features/notes/note-attachments/lib/use-drag-depth';
import { cn } from '@/shared/lib/utils';

export interface NoteAttachmentsPanelProps {
  noteId: string;
  /** The attachment the viewer currently has open, if any. */
  activeId?: string | null;
  /** Ask to open one; the widget owns the split pane and the dialog. */
  onOpen: (documentId: string) => void;
}

/**
 * The Files tab: everything attached to this note, newest first, and the one
 * place a file can be added without a drag.
 *
 * The zone at the bottom carries a BUTTON as well as the dashed border,
 * because drag and drop does not advertise its own existence — it cannot be
 * discovered by looking, it is unavailable on a phone, and it is unavailable
 * to anyone driving this from the keyboard. The dashed border is the hint; the
 * button is the affordance.
 */
export function NoteAttachmentsPanel({
  noteId,
  activeId,
  onOpen,
}: NoteAttachmentsPanelProps) {
  const t = useTranslations('dashboard.note');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isPending, isLoadingError } = useNoteDocuments(noteId);
  const { attach, pendingNames } = useAttachDocuments(noteId);
  const { isDragging, enter, leave, reset } = useDragDepth();

  // Sorted here rather than trusted from the query. The panel promises "newest
  // first" and the query that answers it lives in another slice — both were
  // written against the same contract, and the contract pins the shape, not
  // the ORDER BY. One comparison is cheaper than the two disagreeing.
  const attachments = [...(data ?? [])].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const isEmpty =
    !isPending &&
    !isLoadingError &&
    attachments.length === 0 &&
    pendingNames.length === 0;

  return (
    // `aria-busy` on the container while the list is in flight, matching
    // `NoteLinksPanel`. The heading below names the region, so no separate
    // loading string is invented for it.
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto p-3"
      aria-busy={isPending ? true : undefined}
    >
      <h2 className="flex items-baseline gap-2 px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        {t('attachments.title')}
        {attachments.length > 0 && (
          <span className="font-medium normal-case tracking-normal">
            {t('attachments.count', { count: attachments.length })}
          </span>
        )}
      </h2>

      {isPending && <NoteAttachmentsSkeleton />}

      {isLoadingError && (
        <p className="px-1 text-sm text-destructive">
          {t('attachments.errors.load')}
        </p>
      )}

      {isEmpty && (
        <p className="px-1 text-sm text-muted-foreground">
          {t('attachments.empty')}
        </p>
      )}

      {!isPending && !isLoadingError && (
        <ul>
          {/* Above the list, not below it: these are the newest files in a
              newest-first list, and they are about to become its first rows. */}
          {pendingNames.map((fileName) => (
            <PendingAttachmentRow key={fileName} fileName={fileName} />
          ))}

          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              noteId={noteId}
              attachment={attachment}
              isActive={attachment.id === activeId}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}

      {/* Kept in every state, loading included — it is the only way to add a
          file from a device with no drag, so a state that hides it strands
          the author. `mt-auto` pins it under a short list without stretching
          a long one. */}
      {/* Plain bubble-phase handlers, not the capture-phase ones
          `AttachmentDropZone` needs: nothing here competes for the drop. If the
          widget ever mounts this panel INSIDE that zone, the zone claims the
          event first and these never run — the file still lands, through the
          same `attach`. */}
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          enter();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={leave}
        onDrop={(event) => {
          event.preventDefault();
          reset();
          attach(event.dataTransfer.files);
        }}
        className={cn(
          'mt-auto flex flex-col items-center gap-2 rounded-md border border-dashed p-3 text-center transition-colors',
          isDragging && 'border-foreground/50 bg-muted'
        )}
      >
        <p className="text-xs text-muted-foreground">
          {t('attachments.dropHint')}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          // `min-h-11` (44px), not the `sm` variant's own 32px: this is the
          // control that adds a file on every touch device, where the drop
          // zone around it does nothing at all.
          className="min-h-11"
        >
          <Paperclip className="size-4" />
          {t('attachments.choose')}
        </Button>

        {/* The picker is hidden and driven by the button above, which is the
            visible, focusable, translated control. `accept` is the same list
            the server validates against — narrowing it here only moves the
            rejection earlier, it never replaces it. */}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ACCEPTED_DOCUMENT_MIME_TYPES.join(',')}
          onChange={(event) => {
            attach(event.target.files);
            // Cleared so choosing the SAME file twice in a row still fires
            // `change` the second time.
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
