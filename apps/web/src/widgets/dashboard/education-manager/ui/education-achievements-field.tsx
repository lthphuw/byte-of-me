'use client';

import { useMemo, useState } from 'react';
import { type Control, useFieldArray } from 'react-hook-form';
import { Button } from '@byte-of-me/ui';
import { Reorder } from 'framer-motion';
import { Plus, Trophy } from 'lucide-react';

import { EducationAchievementItemField } from './education-achievement-item-field';

import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { resolveReorderMove } from '@/shared/lib/reorder';

interface EducationAchievementsFieldProps {
  control: Control<EducationFormValues>;
}

/**
 * Ordered list of achievements. Position is the source of truth — `sortOrder`
 * is derived from the array index when the form is submitted, so there is no
 * number to keep in sync by hand.
 */
export function EducationAchievementsField({
  control,
}: EducationAchievementsFieldProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'achievements',
  });

  // Index of the entry added by the button below, so it opens on arrival
  // while everything else stays collapsed.
  const [openOnMountIndex, setOpenOnMountIndex] = useState<number | null>(null);

  const ids = useMemo(() => fields.map((field) => field.id), [fields]);

  const handleReorder = (nextIds: string[]) => {
    const step = resolveReorderMove(ids, nextIds);
    if (step) move(step.from, step.to);
  };

  const handleAdd = () => {
    setOpenOnMountIndex(fields.length);
    append({
      sortOrder: fields.length,
      translations: [{ language: 'en', title: '', content: '' }],
      imageIds: [],
    });
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Achievements</h3>
          {fields.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Drag the handle to reorder — this is the order visitors see.
            </p>
          )}
        </div>

        <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="mr-2 h-3 w-3" />
          Add
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No achievements yet.
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={handleAdd}>
            Add the first one
          </Button>
        </div>
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={ids}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {fields.map((field, index) => (
            <EducationAchievementItemField
              key={field.id}
              id={field.id}
              index={index}
              total={fields.length}
              control={control}
              remove={remove}
              defaultOpen={index === openOnMountIndex}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}
