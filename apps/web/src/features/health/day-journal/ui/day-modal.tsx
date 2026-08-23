'use client';

import { AutoGrowingTextarea, Button } from '@byte-of-me/ui';
import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { MoodScale } from './mood-scale';
import { PhotoStrip } from './photo-strip';

import type { DayEntryRow } from '@/entities/day-entry';
import { useDayJournal } from '@/features/health/day-journal/model/use-day-journal';
import {
  type SleepEntryDefaults,
  SleepEntryForm,
  useSleepEntry,
} from '@/features/health/sleep-entry';
// `@/shared/i18n/navigation`, never `next/navigation` — the raw hook drops the
// locale prefix this app routes every path through.
import { useRouter } from '@/shared/i18n/navigation';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/**
 * One day, editable.
 *
 * **`ResponsiveModal` rather than a Dialog and a Drawer wired up here.** It
 * already mounts a bottom sheet below `lg` and a centred dialog above, and it
 * already answers three things this sheet needs and a fresh implementation
 * would miss: the sheet is sized in `svh`, because on iOS Safari `vh` is the
 * TALL viewport and a `vh`-sized sheet hides its own footer under the browser
 * toolbar; the footer is padded with `env(safe-area-inset-bottom)`; and the
 * dismiss affordance is a grab handle under the thumb rather than an X in the
 * far corner. Its `footer` renders outside the scroll area in both branches,
 * which is the sticky Save this sheet wants.
 *
 * **This modal is why the calendar has no selected state.** The old screen
 * loaded a day into a form BELOW the calendar, and that relationship needed a
 * persistent "this one" mark on the grid — which collided with hover twice,
 * because on a 0%-saturation palette (§14) the plate for one lands within four
 * points of the plate for the other and the numeral pill was doing all the
 * work. A sheet has no such relationship: the day being edited is the day on
 * screen. Deleting the state is the fix; restyling it was not.
 *
 * **One Save, two writes, one rule.** The sleep half writes only when the day
 * already has a row or the form was actually touched. The clocks arrive
 * pre-filled from the fortnight's median — that is what makes the morning save
 * one tap — so saving an untouched day would invent a night out of a guess.
 * Mood and reflection have no defaults to mistake for input and always write.
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
  const t = useTranslations('dashboard.health');
  const router = useRouter();

  const journal = useDayJournal({ localDate, todayKey, entry });
  const sleep = useSleepEntry(sleepDefaults);

  const isSaving = journal.isSaving || sleep.isSaving;

  async function handleSave() {
    try {
      // Sequential rather than `Promise.all`: both writes are upserts on the
      // same day, and a shared failure should not leave one applied while the
      // other is still in flight. The journal goes first because it is the one
      // that always runs.
      await journal.saveAsync();
      if (hasSleepLog || sleep.isDirty) {
        await sleep.saveAsync();
      }

      toast.success(t('day.saved'));

      // Close BEFORE refreshing. The router queues work behind a pending
      // navigation, and refreshing first has stranded a server action in this
      // repo before — the sheet stays open with no failed request to show for
      // it.
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t('day.errorSave')
      );
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('day.title', { date: dateLabel })}
      description={t('day.open', { date: dateLabel })}
      footer={
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
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
      }
    >
      <div className="space-y-6">
        <MoodScale value={journal.mood} onChange={journal.setMood} />

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">{t('day.reflection')}</span>
            <AutoGrowingTextarea
              value={journal.reflection}
              placeholder={t('day.reflectionPlaceholder')}
              onChange={journal.setReflection}
            />
          </label>

          <PhotoStrip
            photos={journal.photos}
            pending={journal.pending}
            dateLabel={dateLabel}
            onPick={journal.pickPhotos}
            onCaption={journal.setCaption}
            onRemove={journal.removePhoto}
          />
        </div>

        {/* The sleep half, ruled off. It is open by default rather than
            collapsed: this is still the sleep screen, and hiding the thing the
            surface is named after behind a disclosure would be a demotion the
            statistics below do not agree with. */}
        <div className="space-y-4 border-t pt-5">
          <span className="text-sm font-medium">{t('day.sleepSection')}</span>
          <SleepEntryForm entry={sleep} targetMin={targetMin} />
        </div>
      </div>
    </ResponsiveModal>
  );
}
