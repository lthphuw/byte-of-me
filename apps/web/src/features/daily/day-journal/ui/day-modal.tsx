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
// Never `next/navigation`: the raw hook drops the locale prefix.
import { useRouter } from '@/shared/i18n/navigation';
// The one lazy entry point every editor here goes through — statically it is
// ~570 KB of tiptap/prosemirror before first paint.
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/**
 * One day, editable — sleep first, then mood, the reflection and the photos.
 *
 * One Save, TWO writes: the sleep half only when the day already has a row or
 * the form was touched, since the clocks open empty and an untouched sheet
 * has no night to invent. Mood and reflection always write.
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

  // Validated BEFORE the first write, not between the two: an invalid pair
  // used to commit the journal and then throw, half-saving the day.
  const writesSleep = hasSleepLog || sleep.isDirty;
  const canSave = !isSaving && (!writesSleep || sleep.canSave);
  const isDirty = journal.isDirty || sleep.isDirty;

  // Undo writes previous values back, so it is honest only where they exist:
  // un-creating a night needs a delete action that does not exist.
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
      // Sequential, not `Promise.all`: two upserts on one day, and a failure
      // must not leave one applied with the other in flight.
      await journal.saveAsync();
      if (writesSleep) {
        await sleep.saveAsync();
      }

      // Close, THEN `router.refresh()`, THEN invalidate — in that order. The
      // router queues work behind a pending navigation, and refreshing first
      // has stranded a server action here with no failed request to show.
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

  // Save on close, not a confirm dialog: photos persist on pick and the text
  // on Save, so a plain dismiss kept half the sheet. Dirty AND invalid falls
  // back to an inline choice in the footer, never a second overlay.
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

          {/* Not a `<label>`: one pointed at a contenteditable does not focus
              it. `aria-labelledby` lands on the contenteditable itself. */}
          <div className="space-y-2">
            <h3 id="day-reflection-label" className="text-sm font-medium">
              {t('day.reflection')}
            </h3>
            {/* `markdownMode`, `uploadImage` and `withMath` withheld: this is
                a paragraph about a Tuesday, and the strip owns pictures. */}
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
