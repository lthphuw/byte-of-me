'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getDescendantCount, noteKeys } from '@/entities/note';
import { getNoteShareExposure, noteShareKeys } from '@/entities/note-share';
import { useNoteMutations } from '@/features/dashboard/note-actions/lib/use-note-mutations';

interface DeleteNoteDialogProps {
  noteId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: (noteId: string) => void;
}

/**
 * The permanent-delete confirmation, and the cascade count it needs to be
 * honest.
 *
 * Split in two, and the split IS the optimisation. The menus have to render
 * this dialog unconditionally, passing `open` as a prop: Radix unmounts a
 * menu's content the moment an item is chosen, so a confirmation mounted
 * inside the menu would be gone before it could be read. That is not
 * negotiable. What it used to mean, though, is that everything in this file
 * mounted with the ROW — `useNoteMutations()` builds four mutations to use
 * one, and each of the two menu surfaces a desktop row renders mounted this
 * dialog and the share one. Measured, in `note-actions-menu.spec.tsx`: 14
 * mutation observers and 6 query observers per row — 560 and 240 in a forty-
 * row tree — for dialogs nobody had opened.
 *
 * So the cost moved into `DeleteNoteDialogBody`, rendered INSIDE
 * `AlertDialogContent`. Radix mounts that content only while the dialog is
 * open (plus the frames its exit animation needs), so a closed dialog is an
 * `AlertDialog` root and nothing else: zero observers of either kind, and the
 * two fetches below cannot be reached at all. Same measurement after the
 * split: 0 and 0.
 *
 * `{open && <DeleteNoteDialog/>}` at the call sites would buy the same thing
 * and cost the exit animation — `AlertDialogContent` carries
 * `data-[state=closed]:animate-out`, and an unmounted root has nothing left to
 * animate, so the confirmation would blink out of existence on the frame the
 * delete succeeds. Letting Radix's own presence do the unmounting keeps it.
 *
 * History worth keeping: the descendant count used to be fetched at ROW level,
 * guarded by an `armed` flag flipped from `onPointerDownCapture`/
 * `onFocusCapture` on a `display: contents` wrapper, purely so that mounting
 * the menu for every visible row did not fire one request per row. Mounting a
 * query where it is read — and only when it is read — makes all of that
 * unnecessary.
 */
export function DeleteNoteDialog(props: DeleteNoteDialogProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <DeleteNoteDialogBody {...props} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Everything that costs something: the two impact fetches and the delete.
 *
 * Mounted and unmounted by Radix along with the dialog it fills — see the
 * component above for why that placement is the whole point.
 */
function DeleteNoteDialogBody({
  noteId,
  title,
  open,
  onOpenChange,
  onRemoved,
}: DeleteNoteDialogProps) {
  const t = useTranslations('dashboard.note');
  const { remove } = useNoteMutations({ onRemoved });

  const { data: descendantCount, isError: countFailed } = useQuery({
    queryKey: noteKeys.descendantCount(noteId),
    queryFn: async () => {
      const res = await getDescendantCount(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    // Kept, though this component now only exists while the dialog is open.
    // The exception is the exit animation: Radix keeps the content mounted
    // with `open` already false while it plays, and this is what stops a
    // window refocus in that window from issuing a request for a dialog that
    // is on its way off screen.
    enabled: open,
    // Overrides the client's global 60s. This number is the sentence "and its
    // N nested notes" in a PERMANENT-DELETE confirmation, and a cached one
    // understates what is about to be destroyed: open the dialog, cancel, add
    // two notes to that folder, reopen inside the window, and the author is
    // told 3 while 5 are deleted. Always ask.
    staleTime: 0,
  });

  const { data: exposure, isError: exposureFailed } = useQuery({
    queryKey: noteShareKeys.exposure(noteId),
    queryFn: async () => {
      const res = await getNoteShareExposure(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: open,
    // Same reasoning as the count above, and for the same reason it matters
    // more here than anywhere else: this sentence says whose access is about
    // to disappear, and a cached one that understates it is wrong in the
    // direction that costs somebody their document.
    staleTime: 0,
  });

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
        <AlertDialogDescription>
          {/* Before the count lands the wording is the plain single-note one,
              and it swaps when the query resolves. That window is one round
              trip beginning as the dialog opens, while the author still has
              to cross to the destructive button; blocking the dialog on a
              fetch would put a spinner inside the very confirmation that
              exists to slow this down. */}
          {descendantCount && descendantCount > 0
            ? t('delete.descriptionWithChildren', {
                title,
                count: descendantCount,
              })
            : t('delete.description', { title })}
        </AlertDialogDescription>

        {/* A sibling of the description, not a child of it:
            `AlertDialogDescription` renders a <p>, and a second block
            element inside one is invalid HTML that React will reparent. */}
        {exposure && exposure.shareCount > 0 ? (
          <p className="text-sm text-destructive">
            {t('delete.descriptionShared', { count: exposure.shareCount })}
          </p>
        ) : null}

        {/* A failed fetch is NOT the same answer as a zero. Without this the
            dialog silently fell back to the single-note wording and dropped
            the "N people lose access" line entirely — understating the blast
            radius in exactly the direction the two `staleTime: 0` notes
            above exist to prevent. Said out loud instead. */}
        {countFailed || exposureFailed ? (
          <p className="text-sm text-destructive">
            {t('delete.impactUnknown')}
          </p>
        ) : null}

        {/* The failure, said in the dialog and not only in a toast. The
            mutation already fires one, but a toast for a PERMANENT delete is
            a message that expires: it can be missed, and once it has gone
            the screen is indistinguishable from a delete that worked. The
            dialog staying open with the reason on it is the durable half of
            that signal. No new message key — this string is the server
            action's own `errorMsg`, the same text the toast carries. */}
        {remove.isError ? (
          <p className="text-sm text-destructive">{remove.error.message}</p>
        ) : null}
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={remove.isPending}>
          {t('delete.cancel')}
        </AlertDialogCancel>
        <AlertDialogAction
          disabled={remove.isPending}
          // `preventDefault`, and it is load-bearing rather than defensive.
          // `AlertDialogAction` IS `DialogPrimitive.Close`: Radix composes
          // this handler with `onOpenChange(false)` through
          // `composeEventHandlers`, which honours `defaultPrevented`. Without
          // the call the dialog is gone on mousedown, a PERMANENT cascading
          // delete runs with its own confirmation already off screen, and the
          // `disabled` above is dead code that can never paint. Same shape as
          // `ConfirmDeleteDialog` in `packages/ui`.
          onClick={(e) => {
            e.preventDefault();
            // Closed from the per-call callback, so it happens on SUCCESS
            // only. A failure leaves the dialog standing with the message
            // above it — closing on failure is how a delete that did not
            // happen looks exactly like one that did.
            //
            // The per-call form is safe HERE and would not be if this
            // observer could unmount mid-flight: TanStack v5 drops
            // `mutate(vars, { onSuccess })` once the observer has no
            // listeners. It cannot — the dialog stays open while the delete
            // runs (that is what the `preventDefault` above is for), so the
            // observer that fired this is still mounted when it resolves.
            remove.mutate(noteId, { onSuccess: () => onOpenChange(false) });
          }}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {remove.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{' '}
          {t('delete.confirm')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
