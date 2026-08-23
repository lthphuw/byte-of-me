'use client';

import { useEffect, useState } from 'react';
import { Button, Label, Textarea } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { FieldHeading, OptionTileGrid } from '@/shared/ui/option-tile-grid';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/** Foster session-RPE runs 0..10 in whole points. Half points exist in the
 *  schema for a SET's RPE; a whole-session rating is not read that finely, and
 *  twenty-one tiles would be a control nobody could hit on a phone. */
const RPE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * Close the session, and record how hard the whole thing was.
 *
 * `endedAt` is what "finished" means — there is no status column — so this is
 * the write that lets a new session be started, which is why the panel behind
 * it says so rather than making the reader discover it.
 *
 * **Session RPE is asked ONCE, at the end, and that is Foster's method, not a
 * shortcut.** Multiplied by the session's duration it gives training load; per
 * set it would be a different measure entirely (and each set already has its
 * own RPE field).
 *
 * The scale reads as a ramp because the word beside it changes with the
 * number, live: "Moderate", "Hard", "Almost maximal". A row of eleven digits
 * says only "more" without saying more of what, and on a palette with no hue
 * (§14) the word is the only channel left. Tapping the chosen tile clears it —
 * the rating is optional and `sessionRpe` is nullable, so there has to be a
 * way back from a stray tap.
 */
export function FinishWorkoutModal({
  open,
  onOpenChange,
  initialNotes,
  summary,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The session's stored note, which finishing may amend rather than replace
   *  by accident — `workoutFinishSchema` writes `notes` unconditionally. */
  initialNotes: string;
  /**
   * What the session came to, drawn ABOVE the rating.
   *
   * A slot rather than a second modal: the live logger wants the summary and
   * the post-workout path does not, but both ask the identical question with
   * the identical eleven tiles, and two copies of that scale is how one of
   * them ends up disagreeing about what a 7 is called. It sits above the
   * question because "how hard was that?" is easier to answer with the
   * workout in front of you than from memory.
   */
  summary?: React.ReactNode;
  onSubmit: (input: {
    sessionRpe: number | null;
    notes: string | null;
  }) => void;
  isSaving: boolean;
}) {
  const t = useTranslations('dashboard.health.workout');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    if (!open) return;

    setRpe(null);
    setNotes(initialNotes);
  }, [open, initialNotes]);

  // Literal keys, one per level: next-intl's generated declarations only
  // type-check literals, so a computed `t(`rpeLevel${n}`)` would type-check
  // against nothing and happily ship a key that does not exist.
  const levelLabels: Record<number, string> = {
    0: t('rpeLevel0'),
    1: t('rpeLevel1'),
    2: t('rpeLevel2'),
    3: t('rpeLevel3'),
    4: t('rpeLevel4'),
    5: t('rpeLevel5'),
    6: t('rpeLevel6'),
    7: t('rpeLevel7'),
    8: t('rpeLevel8'),
    9: t('rpeLevel9'),
    10: t('rpeLevel10'),
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('finish')}
      description={t('finishHint')}
      footer={
        <Button
          type="button"
          disabled={isSaving}
          onClick={() =>
            onSubmit({
              sessionRpe: rpe,
              notes: notes.trim() === '' ? null : notes.trim(),
            })
          }
          className="h-14 w-full rounded-2xl text-base"
        >
          {isSaving ? t('saving') : t('finishAction')}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {summary}

        <div className="space-y-3">
          <FieldHeading
            label={t('rpe')}
            answer={rpe === null ? t('sessionRpeNone') : levelLabels[rpe]}
            answered={rpe !== null}
          />

          <OptionTileGrid
            ariaLabel={t('rpe')}
            columns="grid-cols-4 sm:grid-cols-6"
            options={RPE_LEVELS.map((level) => ({
              value: String(level),
              label: `${level} · ${levelLabels[level]}`,
            }))}
            selected={rpe === null ? [] : [String(rpe)]}
            onToggle={(value) =>
              setRpe((current) =>
                current === Number(value) ? null : Number(value)
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workout-notes">{t('notes')}</Label>
          <Textarea
            id="workout-notes"
            rows={3}
            maxLength={2000}
            value={notes}
            placeholder={t('notesPlaceholder')}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-2xl bg-background"
          />
        </div>
      </div>
    </ResponsiveModal>
  );
}
