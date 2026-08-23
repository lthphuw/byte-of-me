'use client';

import { Button } from '@byte-of-me/ui';
import { Archive, ArchiveRestore, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ExerciseRow } from '@/entities/exercise';
import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import {
  EQUIPMENT_ICON,
  iconForCode,
  METRIC_ICON,
} from '@/shared/ui/gym-icons';

/**
 * One catalogue entry: what it is, what it needs, what a set of it records.
 *
 * The three vocabulary values are drawn as icon + word, never icon alone. A
 * picture of a cog could be a machine or a setting, and the module's rule is
 * that nothing carries meaning on its own — which on a touch screen is not a
 * preference: there is no hover, so a value that lives only in a tooltip does
 * not exist.
 *
 * **Archived is marked in words, not by fading.** `opacity` is a colour signal
 * on a palette with no colour to spare, and a 60%-opacity row against
 * `bg-card` fails 4.5:1 on its own. The badge says it instead, and the action
 * flips to Restore.
 *
 * Both actions carry the exercise's name in their accessible name. They read
 * "Edit" and "Archive" on screen — the card beside them is the context a
 * sighted reader has — but a screen reader moving button to button would
 * otherwise meet thirty controls all called "Edit".
 */
export function ExerciseCard({
  exercise,
  onEdit,
  onToggleArchive,
  isArchiving,
}: {
  exercise: ExerciseRow;
  onEdit: (exercise: ExerciseRow) => void;
  onToggleArchive: (exercise: ExerciseRow) => void;
  isArchiving: boolean;
}) {
  const t = useTranslations('dashboard.health.exercises');
  const labels = useGymLabels();

  const EquipmentIcon = iconForCode(EQUIPMENT_ICON, exercise.equipment);
  const MetricIcon = iconForCode(METRIC_ICON, exercise.metric);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm',
        'transition-colors duration-200 hover:border-primary/40'
      )}
    >
      <div className="min-w-0 space-y-1">
        {/* The name is the way into the exercise's own statistics. A link
            rather than a fourth button in the row below: it is navigation, not
            an action on the row, and it is underlined at rest because on this
            palette `text-primary` is 9% lightness against a 3.9% foreground —
            a link marked only by colour is not visibly a link, and a
            hover-only underline does not exist on touch at all (§14). */}
        <Link
          href={`/space/health/exercises/${exercise.id}`}
          className="break-safe block min-h-11 py-2 text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {exercise.name}
        </Link>

        <p className="break-safe flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{labelForCode(labels.muscle, exercise.primaryMuscle)}</span>

          <span className="inline-flex items-center gap-1">
            {EquipmentIcon ? (
              <EquipmentIcon aria-hidden className="size-3.5 shrink-0" />
            ) : null}
            {labelForCode(labels.equipment, exercise.equipment)}
          </span>

          <span className="inline-flex items-center gap-1">
            {MetricIcon ? (
              <MetricIcon aria-hidden className="size-3.5 shrink-0" />
            ) : null}
            {labelForCode(labels.metric, exercise.metric)}
          </span>
        </p>

        {exercise.secondaryMuscles.length > 0 ? (
          <p className="break-safe text-xs text-muted-foreground">
            {exercise.secondaryMuscles
              .map((code) => labelForCode(labels.muscle, code))
              .join(', ')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {exercise.isArchived ? (
          <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {t('archived')}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label={t('editNamed', { name: exercise.name })}
            onClick={() => onEdit(exercise)}
            className="h-11 rounded-xl px-3"
          >
            <Pencil aria-hidden className="mr-2 size-4" />
            {t('edit')}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isArchiving}
            aria-label={
              exercise.isArchived
                ? t('restoreNamed', { name: exercise.name })
                : t('archiveNamed', { name: exercise.name })
            }
            onClick={() => onToggleArchive(exercise)}
            className="h-11 rounded-xl px-3"
          >
            {exercise.isArchived ? (
              <ArchiveRestore aria-hidden className="mr-2 size-4" />
            ) : (
              <Archive aria-hidden className="mr-2 size-4" />
            )}
            {exercise.isArchived ? t('restore') : t('archive')}
          </Button>
        </div>
      </div>
    </div>
  );
}
