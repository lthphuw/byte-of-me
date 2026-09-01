'use client';

import { Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { splitMinutes } from '@/shared/lib/health/duration';
import { cn } from '@/shared/lib/utils';

/**
 * Last night, as a control rather than a readout — the one thing done every
 * morning, so it is the first thing on the screen and one tap from landing.
 *
 * Both states open the same sheet on the same day: unlogged offers to write
 * it, logged shows the figure and edits it. The accessible name carries the
 * verb and the date, so nothing here has to be captioned.
 */
export function DayEntryCard({
  totalSleepMin,
  estimated,
  targetMin,
  dateLabel,
  onOpen,
}: {
  /** Minutes asleep last night, or `null` when it has not been logged. */
  totalSleepMin: number | null;
  estimated: boolean;
  targetMin: number;
  /** The night's date, spelled out, for the accessible name. */
  dateLabel: string;
  onOpen: () => void;
}) {
  const t = useTranslations('dashboard.daily');

  const logged = totalSleepMin !== null;
  const duration = logged
    ? t('units.hoursMinutes', splitMinutes(totalSleepMin))
    : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={
        duration === null
          ? t('lastNight.logAction', { date: dateLabel })
          : t('lastNight.editAction', { date: dateLabel, duration })
      }
      className={cn(
        'group flex w-full items-center gap-4 rounded-3xl border bg-card p-5 text-left shadow',
        'transition-[box-shadow,transform] duration-200 ease-out motion-reduce:transition-none',
        'hover:ring-1 hover:ring-foreground/25',
        'active:scale-[0.99] motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // The unlogged card is the screen's one primary action, and the
        // palette has no hue to say so with — weight of border and fill do.
        logged || 'border-foreground/30'
      )}
    >
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-xs font-medium text-muted-foreground">
          {t('lastNight.label')}
        </span>
        <span className="block text-3xl font-semibold tabular-nums leading-tight">
          {duration ?? t('lastNight.notLogged')}
        </span>
        {duration === null ? null : (
          <span className="block text-xs text-muted-foreground">
            {estimated
              ? t('lastNight.estimated')
              : t('sleep.nightlyTarget', splitMinutes(targetMin))}
          </span>
        )}
      </span>

      <span
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-full',
          logged
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {logged ? (
          <Pencil aria-hidden className="size-5" />
        ) : (
          <Plus aria-hidden className="size-6" />
        )}
      </span>
    </button>
  );
}
