'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Languages, Plus, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import {
  type EducationFormValues,
  educationSchema,
} from '@/entities/education/schemas/education';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { Button } from '@/shared/ui/button';
import { DatePicker } from '@/shared/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/shared/ui/form';
import { Icons } from '@/shared/ui/icons';
import { Input } from '@/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { EducationAchievementItemField } from '@/widgets/education-manager/ui/education-achievement-item-field';

interface EducationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
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
    fields: educationTranslations,
    append: appendEducationTranslation,
    remove: removeEducationTranslation,
  } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  const {
    fields: achievements,
    append: appendAchievement,
    remove: removeAchievement,
  } = useFieldArray({
    control: form.control,
    name: 'achievements',
  });

  const [educationTab, setEducationTab] = useState<string>();
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
          initialData.achievements?.map((a: any) => ({
            id: a.id,
            sortOrder: a.sortOrder ?? 0,
            translations:
              a.translations?.length > 0
                ? a.translations
                : [{ language: 'en', title: '', content: '' }],
            imageIds: a.images?.map((it: any) => it.mediaId) ?? [],
          })) ?? [],
      });
    } else {
      form.reset();
    }
  }, [initialData, open, form]);

  useEffect(() => {
    if (educationTranslations.length > 0)
      setEducationTab(educationTranslations[0].id);
  }, [educationTranslations]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit PublicEducation' : 'Add PublicEducation'}
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
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Translations</h3>
              </div>

              <Tabs value={educationTab} onValueChange={setEducationTab}>
                <div
                  className={'mb-2 flex w-full justify-between align-middle'}
                >
                  <TabsList>
                    {educationTranslations.map((f, i) => {
                      const lang = form.watch(`translations.${i}.language`);
                      return (
                        <TabsTrigger key={f.id} value={f.id}>
                          {lang?.toUpperCase()}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      appendEducationTranslation({
                        language: 'New',
                        title: '',
                        description: '',
                      })
                    }
                  >
                    Add Language <Languages />
                  </Button>
                </div>

                {educationTranslations.map((f, i) => (
                  <TabsContent key={f.id} value={f.id}>
                    <FormField
                      control={form.control}
                      name={`translations.${i}.language`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Input {...field} />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`translations.${i}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School / Degree</FormLabel>
                          <Input {...field} />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`translations.${i}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <Input {...field} value={field.value ?? ''} />
                        </FormItem>
                      )}
                    />

                    <Button
                      className={'mt-2 w-full'}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeEducationTranslation(i)}
                    >
                      <Trash /> Remove Education Translation
                    </Button>
                  </TabsContent>
                ))}
              </Tabs>
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
