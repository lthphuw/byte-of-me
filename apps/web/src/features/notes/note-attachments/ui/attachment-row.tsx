'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  ConfirmDeleteDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@byte-of-me/ui';
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { ATTACHMENT_ROW_CLASS } from './attachment-row-shell';

import {
  noteDocumentHref,
  type NoteDocumentSummary,
  useDeleteNoteDocument,
} from '@/entities/note-document';
import { cn } from '@/shared/lib/utils';

/** The two lines inside a row, so the real and the in-flight one match. */
const ROW_BODY_CLASS = 'flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5';

export interface AttachmentRowProps {
  /** The note the attachment hangs off — what the delete mutation invalidates. */
  noteId: string;
  attachment: NoteDocumentSummary;
  /** The one the viewer currently has open, wherever the viewer is. */
  isActive?: boolean;
  /** Ask to open it. The widget owns the split pane and the dialog. */
  onOpen: (documentId: string) => void;
}

/**
 * One attachment: what it is, how big, when it arrived, and the four things
 * that can be done with it.
 *
 * The menu carries "open in a new tab" and "download" beside "open" because
 * the in-app viewer is an `<iframe>`, and an iframe is not a promise anyone
 * can keep on every browser — iOS Safari renders the first page of a PDF and
 * refuses to scroll it. The row must therefore never be the only way in.
 */
export function AttachmentRow({
  noteId,
  attachment,
  isActive,
  onOpen,
}: AttachmentRowProps) {
  // The whole `dashboard.note` namespace rather than `…note.attachments`: the
  // menu trigger's name is `tree.actionsAriaLabel`, an existing key one level
  // up. The pinned contract names no key for it, and inventing one would
  // render a raw key path until the (parallel) i18n slice happened to guess
  // the same name.
  const t = useTranslations('dashboard.note');
  const tError = useTranslations('error');
  const format = useFormatter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // `useDeleteNoteDocument` lives in `entities/`, so it cannot name the
  // namespace this copy belongs to and falls back to English literals when it
  // is handed nothing — English on the path an author walks every time they
  // remove a file.
  //
  // The failure title is the app-wide generic rather than anything under
  // `attachments.*`: the contract pins no string for a delete that fails, and
  // both near neighbours would be untrue — `errors.upload` is about attaching
  // and `dashboard.note.errors.delete` says the NOTE could not be deleted,
  // which is the one thing an author must not be told here. The server's own
  // reason arrives as the toast's description either way.
  const deleteMessages = useMemo(
    () => ({
      removed: t('toasts.attachmentRemoved'),
      error: tError('somethingWentWrong'),
    }),
    [t, tError]
  );
  const { remove, isPending } = useDeleteNoteDocument(noteId, deleteMessages);

  const href = noteDocumentHref(attachment.id);

  const confirmDelete = () => {
    remove(attachment.id)
      // The hook owns the toast on both outcomes; the row only has to stop
      // showing the confirmation either way.
      .catch(() => undefined)
      .finally(() => setConfirmOpen(false));
  };

  return (
    <li>
      <div
        className={cn(
          ATTACHMENT_ROW_CLASS,
          'group',
          // The palette is achromatic, so the open attachment is marked by a
          // filled surface rather than a tint — §14: colour is not a signal.
          isActive && 'bg-muted'
        )}
      >
        <button
          type="button"
          onClick={() => onOpen(attachment.id)}
          aria-current={isActive ? 'true' : undefined}
          className={cn(
            ROW_BODY_CLASS,
            'rounded-md text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
          )}
        >
          <FileText className="size-4 shrink-0 opacity-60" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{attachment.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {t('attachments.sizeLabel', {
                // Megabytes, because the message owns the unit: `sizeLabel` is
                // "{size} MB" in both locales, so a preformatted "1.4 MB" here
                // would render "1.4 MB MB".
                //
                // Formatted through next-intl rather than handed over as a
                // number — `{size}` carries no ICU `number` skeleton, so the
                // typed messages declare it a string and a raw number would
                // print with an English decimal point to a Vietnamese reader,
                // who writes 1,4. Two fraction digits because the ceiling is
                // 5 MB: at one, a 300 KB attachment reads "0 MB".
                size: format.number(attachment.size / 1024 / 1024, {
                  maximumFractionDigits: 2,
                }),
              })}
              {' · '}
              {format.dateTime(attachment.createdAt, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              // The file name is part of the name because a panel of five
              // attachments would otherwise offer five buttons all called
              // "Note actions", which is unusable in an element list.
              aria-label={`${t('tree.actionsAriaLabel')}: ${attachment.title}`}
              // `min-h-11 min-w-11`, NOT `size-11`: this repo pins
              // tailwind-merge 1.x, which predates the `size-*` group, so
              // `size-11` never displaces the variant's own `h-9 w-9` and the
              // button paints 36px. `note-link-row-shell.ts` records the same
              // discovery. The min-* pair wins on any merge order.
              className="min-h-11 min-w-11 shrink-0"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            {/* `min-h-11` on every item: the menu is reachable by finger on the
                iPad width where the workspace splits, and the shadcn default
                (`py-1.5`) is a 32px row. */}
            <DropdownMenuItem
              className="min-h-11"
              onSelect={() => onOpen(attachment.id)}
            >
              <FileText />
              {t('attachments.open')}
            </DropdownMenuItem>

            <DropdownMenuItem className="min-h-11" asChild>
              {/* `rel="noreferrer"`: the route is behind `requireAdmin`, and a
                  new tab opened with an opener still hands a reference back. */}
              <a href={href} target="_blank" rel="noreferrer">
                <ExternalLink />
                {t('attachments.openNewTab')}
              </a>
            </DropdownMenuItem>

            <DropdownMenuItem className="min-h-11" asChild>
              {/* The route answers with `Content-Disposition: inline` so the
                  viewer can read it in place; `download` is what turns the
                  same URL into a save. Same-origin, so the attribute holds. */}
              <a href={href} download={attachment.title}>
                <Download />
                {t('attachments.download')}
              </a>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="min-h-11 text-destructive focus:text-destructive"
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2 />
              {t('attachments.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* `ConfirmDeleteDialog` lives in `packages/ui`, which has no next-intl —
          every string it shows is passed in, `cancelText` included, or it falls
          back to its English DEFAULTS, which is what a missing prop would show
          a Vietnamese reader.

          The description is the file's own name for that reason: the contract
          pins no sentence for it, and the name is the one thing here that
          needs no translation while still answering "which one?". The warning
          it does not carry is carried by the action instead — `deleteConfirm`
          is "Remove for good" / "Xóa hẳn". */}
      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        isLoading={isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t('attachments.delete')}
        description={attachment.title}
        actionText={t('attachments.deleteConfirm')}
        cancelText={t('attachments.deleteConfirmCancel')}
      />
    </li>
  );
}

/**
 * The row an upload occupies while it is still in flight, keyed by file name —
 * the only thing known about a file the server has not answered for yet.
 *
 * Disabled rather than absent: an upload that showed nothing until it landed
 * read as a drop that had missed, which is the same failure
 * `NotePropertiesPanel` records for its status chips.
 */
export function PendingAttachmentRow({ fileName }: { fileName: string }) {
  const t = useTranslations('dashboard.note.attachments');

  return (
    <li>
      <div aria-disabled className={cn(ATTACHMENT_ROW_CLASS, 'opacity-60')}>
        <div className={ROW_BODY_CLASS}>
          {/* `animate-spin` stays under reduced motion, per §14: dropping the
              only signal that something is in progress is worse than the
              motion. */}
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{fileName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {t('uploading')}
            </span>
          </span>
        </div>
      </div>
    </li>
  );
}
