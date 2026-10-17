'use client';

import { useState } from 'react';
import { type Control, useFieldArray } from 'react-hook-form';
import type { EducationFormValues } from '@byte-of-me/contracts/education';
import { Button } from '@byte-of-me/ui';
import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EducationAchievementItemField } from './education-achievement-item-field';

import { AddButton } from '@/shared/ui';

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
  const t = useTranslations('dashboard.education');
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'achievements',
  });

  // Index of the entry added by the button below, so it opens on arrival
  // while everything else stays collapsed.
  const [openOnMountIndex, setOpenOnMountIndex] = useState<number | null>(null);

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
        <h3 className="text-sm font-medium">{t('achievements.title')}</h3>

        <AddButton
          label={t('achievements.addButton')}
          onClick={handleAdd}
          variant="outline"
        />
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t('achievements.emptyText')}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 can-hover:min-h-9"
            onClick={handleAdd}
          >
            {t('achievements.addFirstButton')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <EducationAchievementItemField
              key={field.id}
              index={index}
              total={fields.length}
              control={control}
              remove={remove}
              move={move}
              defaultOpen={index === openOnMountIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}
