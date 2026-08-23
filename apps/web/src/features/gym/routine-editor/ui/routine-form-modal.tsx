'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label, Textarea } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RoutineItemRow } from './routine-item-row';

import { ExercisePickerModal } from '@/features/gym/exercise-catalog';
import {
  emptyRoutineDraft,
  hasInvertedRepRange,
  moveItem,
  type RoutineDraft,
} from '@/features/gym/routine-editor/lib/routine-drafts';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/**
 * Create or edit one routine: a name, an optional note, and an ordered list of
 * exercises with optional targets.
 *
 * One component for both, because a create and an update differ only in
 * whether `id` travels — and because an update REPLACES the item list, which
 * means the two send the same payload shape anyway.
 *
 * **The exercise picker is a modal inside this modal.** Both are Radix, both
 * portal to the body, and the one mounted later stacks and traps focus above
 * the other; closing it returns focus here. The alternative — a picker on its
 * own route — would lose an unsaved draft on the way there, which for a plan
 * with six exercises and their targets is the whole edit.
 *
 * The draft resets from `initial` when the modal OPENS rather than on every
 * render, so editing survives a keystroke, and reopening on another routine
 * does not show the last one's items.
 *
 * A rep range that runs backwards blocks the save HERE, next to the two inputs
 * that disagree. `routineItems` refuses it server-side too, with a message
 * naming two schema fields — accurate, and not something to show a reader.
 */
export function RoutineFormModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The routine being edited, or null for a new one. */
  initial: RoutineDraft | null;
  onSubmit: (draft: RoutineDraft) => void;
  isSaving: boolean;
}) {
  const t = useTranslations('dashboard.health.routines');
  const [draft, setDraft] = useState<RoutineDraft>(
    initial ?? emptyRoutineDraft()
  );
  const [isPickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) setDraft(initial ?? emptyRoutineDraft());
  }, [open, initial]);

  const repRangeInverted = hasInvertedRepRange(draft);
  const canSave = draft.name.trim() !== '' && !repRangeInverted && !isSaving;

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title={initial ? t('editTitle') : t('createTitle')}
        description={t('description')}
        footer={
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => onSubmit(draft)}
            className="h-14 w-full rounded-2xl text-base"
          >
            {isSaving ? t('saving') : t('save')}
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <Label htmlFor="routine-name">{t('name')}</Label>
            <Input
              id="routine-name"
              value={draft.name}
              maxLength={120}
              placeholder={t('namePlaceholder')}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="h-14 rounded-2xl bg-background text-base transition-colors duration-200 hover:border-primary/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="routine-notes">{t('notes')}</Label>
            <Textarea
              id="routine-notes"
              rows={3}
              maxLength={2000}
              value={draft.notes}
              placeholder={t('notesPlaceholder')}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              className="rounded-2xl bg-background"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{t('items')}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {t('itemCount', { n: draft.items.length })}
              </span>
            </div>

            {draft.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noItems')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {draft.items.map((item, index) => (
                  <RoutineItemRow
                    key={item.key}
                    item={item}
                    index={index}
                    total={draft.items.length}
                    onChange={(next) =>
                      setDraft((current) => ({
                        ...current,
                        items: current.items.map((existing) =>
                          existing.key === item.key ? next : existing
                        ),
                      }))
                    }
                    onMove={(delta) =>
                      setDraft((current) => ({
                        ...current,
                        items: moveItem(current.items, index, delta),
                      }))
                    }
                    onRemove={() =>
                      setDraft((current) => ({
                        ...current,
                        items: current.items.filter(
                          (existing) => existing.key !== item.key
                        ),
                      }))
                    }
                  />
                ))}
              </ul>
            )}

            {repRangeInverted ? (
              /* `destructive-text`, not `destructive`: §14 records that the
                 fill token measures 3.76:1 as text. */
              <p className="text-sm text-destructive-text">
                {t('repsRangeError')}
              </p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(true)}
              className="h-12 w-full rounded-2xl"
            >
              <Plus aria-hidden className="mr-2 size-4" />
              {t('addItem')}
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      <ExercisePickerModal
        open={isPickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(exercise) =>
          setDraft((current) => ({
            ...current,
            items: [
              ...current.items,
              {
                // `randomUUID` rather than the index: a new item has no server
                // id, and an index-keyed row loses its input state the moment
                // two rows are reordered.
                key: crypto.randomUUID(),
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                primaryMuscle: exercise.primaryMuscle,
                targetSets: '',
                targetRepsLow: '',
                targetRepsHigh: '',
                targetRpe: '',
                restSec: '',
              },
            ],
          }))
        }
      />
    </>
  );
}
