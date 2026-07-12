'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button , DatePicker ,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel, FormMessage, Icons } from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';

import type { AdminEducation } from '@/entities/education';
import {
  type EducationFormValues,
  educationSchema,
} from '@/entities/education/model/education-schema';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { TextField, TranslationTabs } from '@/shared/ui';
import { EducationAchievementItemField } from '@/widgets/dashboard/education-manager/ui/education-achievement-item-field';

interface EducationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Nullable<AdminEducation>;
  onSubmit: (data: EducationFormValues) => void;
  loading?: boolean;
}

export function EducationDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: EducationDialogProps) {
  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      sortOrder: 0,
      startDate: new Date(),
      endDate: null,
      logoId: null,
      translations: [{ language: 'en', title: '', description: '' }],
      achievements: [],
    },
  });

  const {
    fields: achievements,
    append: appendAchievement,
    remove: removeAchievement,
  } = useFieldArray({
    control: form.control,
    name: 'achievements',
  });

  const [achievementTabs, setAchievementTabs] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      form.reset({
        id: initialData.id,
        sortOrder: initialData.sortOrder ?? 0,
        startDate: initialData.startDate
          ? new Date(initialData.startDate)
          : new Date(),
        endDate: initialData.endDate ? new Date(initialData.endDate) : null,
        logoId: initialData.logoId ?? null,

        translations:
          initialData.translations?.length > 0
            ? initialData.translations
            : [{ language: 'en', title: '', description: '' }],

        achievements:
          initialData.achievements?.map((a) => ({
            id: a.id,
            sortOrder: a.sortOrder ?? 0,
            translations:
              a.translations?.length > 0
                ? a.translations
                : [{ language: 'en', title: '', content: '' }],
            imageIds: a.images?.map((it) => it.mediaId) ?? [],
          })) ?? [],
      });
    } else {
      form.reset();
    }
  }, [initialData, open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Education' : 'Add Education'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="logoId"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Institution Logo</FormLabel>
                    <FormControl>
                      <MediaSelect
                        value={field.value ?? undefined}
                        onChange={(media) => field.onChange(media?.id)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <DatePicker
                      value={field.value}
                      onChange={(d) => field.onChange(d || null)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Translations</h3>
              </div>

              <TranslationTabs
                control={form.control}
                name="translations"
                newTranslation={() => ({
                  language: '',
                  title: '',
                  description: '',
                })}
                renderFields={(i) => (
                  <>
                    <TextField
                      control={form.control}
                      name={`translations.${i}.title`}
                      label="School / Degree"
                    />

                    <TextField
                      control={form.control}
                      name={`translations.${i}.description`}
                      label="Description"
                    />
                  </>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Achievements</h3>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    appendAchievement({
                      sortOrder: 0,
                      translations: [
                        { language: 'New', title: '', content: '' },
                      ],
                      imageIds: [],
                    })
                  }
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add
                </Button>
              </div>

              {achievements.map((item, index) => (
                <EducationAchievementItemField
                  key={item.id}
                  index={index}
                  control={form.control}
                  watch={form.watch}
                  remove={removeAchievement}
                  tab={achievementTabs[index]}
                  setTab={(val) =>
                    setAchievementTabs((prev) => ({
                      ...prev,
                      [index]: val,
                    }))
                  }
                />
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}{' '}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
