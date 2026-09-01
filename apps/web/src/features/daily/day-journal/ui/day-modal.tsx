'use client';

import { useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { MoodScale } from './mood-scale';
import { PhotoStrip } from './photo-strip';

import type { DayEntryRow } from '@/entities/day-entry';
import { sleepLogKeys } from '@/entities/sleep-log';
import { useDayJournal } from '@/features/daily/day-journal/model/use-day-journal';
import {
  type SleepEntryDefaults,
  SleepEntryForm,
  useSleepEntry,
} from '@/features/daily/sleep-entry';
// `@/shared/i18n/navigation`, never `next/navigation` — the raw hook drops the
// locale prefix this app routes every path through.
import { useRouter } from '@/shared/i18n/navigation';
// The one lazy entry point every editor in this repo goes through. Imported
// statically the editor is ~570 KB of tiptap/prosemirror before first paint,
// on the route most likely to be opened one-handed at 6am.
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/**
 * One day, editable — sleep first, then mood, the reflection and the photos.
 *
 * **The night leads.** The two clocks used to sit ~700px down this sheet,
 * below a mood ramp, a 140px editor, a photo strip and a 176px duration ring;
 * on a 390px phone the scroll body is about 570px, so the one control the
 * surface exists for was off screen at open.
 *
 * **`ResponsiveModal` rather than a Dialog and a Drawer wired up here.** It
 * mounts a bottom sheet below `lg` and a centred dialog above, sizes the sheet
 * in `svh` (on iOS Safari `vh` is the TALL viewport and hides the sheet's own
 * footer under the browser toolbar), pads the footer with
 * `env(safe-area-inset-bottom)`, and renders that footer outside the scroll
 * area — which is the sticky Save this sheet wants.
 *
 * **This modal is why the calendar has no selected state.** A sheet has no
 * "which one" relationship to mark: the day being edited is the day on screen.
 *
 * **One Save, two writes, one rule.** The sleep half writes only when the day
 * already has a row or the form was actually touched — the clocks now open
 * empty and offer the fortnight's median as a card, so an untouched sheet has
 * no night to invent. Mood and reflection always write.
 */
export function DayModal({
  open,
  onOpenChange,
  localDate,
  todayKey,
  dateLabel,
  entry,
  sleepDefaults,
  hasSleepLog,
  targetMin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localDate: string;
  todayKey: string;
  dateLabel: string;
  entry: DayEntryRow | null;
  sleepDefaults: SleepEntryDefaults;
  hasSleepLog: boolean;
  targetMin: number;
}) {
  const t = useTranslations('dashboard.daily');
  const router = useRouter();
  const queryClient = useQueryClient();

  const journal = useDayJournal({ localDate, todayKey, entry });
  const sleep = useSleepEntry(sleepDefaults);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isSaving = journal.isSaving || sleep.isSaving;

  // Validated BEFORE the first write, not between the two: an invalid clock
  // pair used to commit the journal and then throw on the night, leaving half
  // a day saved under a failure toast.
  const writesSleep = hasSleepLog || sleep.isDirty;
  const canSave = !isSaving && (!writesSleep || sleep.canSave);
  const isDirty = journal.isDirty || sleep.isDirty;

  // Undo writes the previous values back, so it is only honest where previous
  // values exist. A night this save CREATED would need a delete to un-create,
  // and there is no delete action — that toast stays plain.
  const canUndo = !writesSleep || hasSleepLog;

  function announce() {
    router.refresh();
    queryClient.invalidateQueries({ queryKey: sleepLogKeys.summaryAll() });
    queryClient.invalidateQueries({ queryKey: sleepLogKeys.today() });
  }

  async function handleUndo() {
    try {
      await journal.restoreAsync();
      if (writesSleep) await sleep.restoreAsync();

      announce();
      toast.success(t('day.undone'));
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t('day.errorSave')
      );
    }
  }

  async function handleSave() {
    if (!canSave) return;

    try {
      // Sequential rather than `Promise.all`: both writes are upserts on the
      // same day, and a shared failure should not leave one applied while the
      // other is still in flight.
      await journal.saveAsync();
      if (writesSleep) {
        await sleep.saveAsync();
      }

      // One toast and one refresh for the whole sheet. Close, then refresh,
      // then invalidate, in that order: the router queues work behind a
      // pending navigation, and refreshing before the close has stranded a
      // server action in this repo before, with no failed request to show.
      toast.success(
        t('day.saved'),
        canUndo
          ? { action: { label: t('day.undo'), onClick: () => void handleUndo() } }
          : undefined
      );
      onOpenChange(false);
      announce();
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t('day.errorSave')
      );
    }
  }

  // Save on close, not a confirm dialog. Mood and the reflection only persist
  // on Save while photos and captions persist immediately, so a plain dismiss
  // used to keep half the sheet and lose the other half. The one case that
  // cannot be saved — a night that is dirty AND invalid — falls back to an
  // inline choice in the footer; never a second overlay over this one.
  function requestClose() {
    if (isSaving) return;
    if (!isDirty) {
      onOpenChange(false);
      return;
    }
    if (canSave) {
      void handleSave();
      return;
    }
    setConfirmDiscard(true);
  }

  const showDiscard = confirmDiscard && !canSave;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
      title={t('day.title', { date: dateLabel })}
      description={t('day.open', { date: dateLabel })}
      footer={
        showDiscard ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive-text">
              {t('day.discardPrompt')}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="h-12 flex-1 rounded-full"
              >
                {t('day.keepEditing')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-12 flex-1 rounded-full"
              >
                {t('day.discard')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="h-14 w-full rounded-full text-base lg:h-12"
          >
            {isSaving ? (
              <>
                <LoaderCircle
                  aria-hidden
                  className="mr-2 size-4 animate-spin motion-reduce:animate-none"
                />
                {t('day.saving')}
              </>
            ) : (
              t('day.save')
            )}
          </Button>
        )
      }
    >
      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-medium">{t('day.sleepSection')}</h3>
          <SleepEntryForm entry={sleep} targetMin={targetMin} />
        </section>

        {/* The day half, ruled off from the night above it. */}
        <div className="space-y-6 border-t pt-6">
          <MoodScale value={journal.mood} onChange={journal.setMood} />

          {/* Not a `<label>`: a `<label>` whose control is a contenteditable
              does not focus it the way it focuses an input. `RichTextEditor`
              does take `aria-labelledby`, applied straight to the
              contenteditable, so the heading labels the editor directly. */}
          <div className="space-y-2">
            <h3 id="day-reflection-label" className="text-sm font-medium">
              {t('day.reflection')}
            </h3>
            {/* `markdownMode`, `uploadImage` and `withMath` are all withheld:
                a raw-source toggle is for a document not a paragraph about a
                Tuesday, the strip below already owns attaching pictures, and
                nothing in a day journal needs a formula. */}
            <RichTextEditor
              id="day-reflection"
              aria-labelledby="day-reflection-label"
              value={journal.reflection ?? undefined}
              onChange={(doc) => journal.setReflection(doc)}
              placeholder={t('day.reflectionPlaceholder')}
              compact
              minHeight={140}
            />
          </div>

          <PhotoStrip
            photos={journal.photos}
            pending={journal.pending}
            dateLabel={dateLabel}
            onPick={journal.pickPhotos}
            onCaption={journal.setCaption}
            onRemove={journal.removePhoto}
          />
        </div>
      </div>
    </ResponsiveModal>
  );
}
