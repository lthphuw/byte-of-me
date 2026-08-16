'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { noteKeys, relabelInboundNoteLinks } from '@/entities/note';
import { useWorkspaceSettings } from '@/entities/workspace-settings';

/**
 * Brings the LABELS of links pointing at a note back in step with its title.
 *
 * A note link's `href` carries the note's id, so a rename never breaks
 * navigation — see the header of `entities/note/model/note-links.ts`. What it
 * does break is the visible text, which was a copy of the title at the moment
 * the link was inserted. This is what repairs that, and only that.
 *
 * ## Nothing here blocks
 *
 * The rename itself is one write and returns immediately; this never sits in
 * front of it. The call below is deliberately NOT awaited by any caller —
 * `run` returns `void` — so the tree keeps responding and the caret keeps
 * moving while other notes are rewritten. Every document walk happens on the
 * server, so the browser does no parsing at all.
 *
 * ## Why the author gets asked
 *
 * Only anchors whose text is still an exact copy of the OLD title are touched;
 * a label someone wrote themselves is left alone. That rule is safe but it is
 * not obvious from outside, and rewriting documents nobody opened is the kind
 * of thing that should be visible. `ask` (the default) does a dry run first and
 * offers the count; `always` skips straight to the write; `never` does nothing.
 */
export function useRelabelInboundLinks() {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const { settings } = useWorkspaceSettings();

  // The policy is read at CALL time, not closed over: `run` is handed to
  // mutation callbacks that outlive the render it was created in, and a policy
  // the author changed in the settings dialog since then is the one that should
  // apply.
  const policyRef = useRef(settings.updateLinksOnRename);
  policyRef.current = settings.updateLinksOnRename;

  /**
   * Applies the new title to inbound labels, or offers to.
   *
   * Fire and forget. Errors are swallowed into a toast rather than rethrown:
   * this runs after a rename that already succeeded, and failing to tidy up
   * afterwards must not make the rename look like it failed.
   */
  const commit = useCallback(
    async (noteId: string, previousTitle: string, nextTitle: string) => {
      const result = await relabelInboundNoteLinks({
        noteId,
        previousTitle,
        nextTitle,
      });

      if (!result.success) {
        toast.error(t('relabel.failed'), { description: result.errorMsg });
        return;
      }
      if (result.data.notes === 0) return;

      // The rewritten notes are OTHER notes, whose cached details are now
      // stale. `removeQueries` rather than `invalidateQueries`: none of them is
      // on screen, so invalidation would only mark inactive entries stale and
      // leave them to be refetched anyway — while a detail that IS somehow
      // mounted must not be refetched under a debounced autosave, which is the
      // hazard `use-note-editor-autosave.ts` documents at length.
      queryClient.removeQueries({ queryKey: noteKeys.detailAll() });

      // Nothing else is invalidated, and each omission is deliberate rather
      // than forgotten. No title changed, so no list key is stale. The link
      // GRAPH is byte-identical — only the words inside an anchor moved, never
      // an `href` — so neither `linksAll` nor `graph` has anything to re-read.
      // Over-invalidating here would put a full graph refetch behind an
      // operation whose whole purpose is to be unobtrusive.

      toast.success(t('relabel.done', { count: result.data.notes }));
    },
    [queryClient, t]
  );

  const run = useCallback(
    (noteId: string, previousTitle: string, nextTitle: string): void => {
      const policy = policyRef.current;
      if (policy === 'never') return;
      // Cheap guards before any round trip. The editor's title autosave calls
      // this on every settled edit, and most of those are not renames at all.
      if (previousTitle === nextTitle) return;
      if (previousTitle.trim() === '') return;

      void (async () => {
        try {
          if (policy === 'always') {
            await commit(noteId, previousTitle, nextTitle);
            return;
          }

          // `ask`: find out whether there is anything to ask ABOUT before
          // interrupting. A rename with no stale inbound labels — by far the
          // common case — produces no prompt at all.
          const preview = await relabelInboundNoteLinks({
            noteId,
            previousTitle,
            nextTitle,
            dryRun: true,
          });

          if (!preview.success || preview.data.notes === 0) return;

          // A toast with an action rather than a modal, on purpose: the author
          // has just renamed something and is probably mid-thought. A dialog
          // would demand an answer before they can carry on; this waits at the
          // corner of the screen and expires on its own if ignored, leaving
          // the labels exactly as they were.
          toast(t('relabel.prompt', { count: preview.data.notes }), {
            duration: 12000,
            action: {
              label: t('relabel.confirm'),
              onClick: () => {
                void commit(noteId, previousTitle, nextTitle);
              },
            },
          });
        } catch (error) {
          toast.error(t('relabel.failed'), { description: String(error) });
        }
      })();
    },
    [commit, t]
  );

  return run;
}
