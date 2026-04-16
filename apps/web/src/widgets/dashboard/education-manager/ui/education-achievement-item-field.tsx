'use client';

import { useEffect } from 'react';
import {
  type Control,
  useFieldArray,
  type UseFormWatch,
} from 'react-hook-form';
import { Languages, Trash, X } from 'lucide-react';

import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { MediaMultiSelect } from '@/features/dashboard/media-library/ui/media-multi-select';
import { Button } from '@/shared/ui/button';
import { FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

interface EducationAchievementItemFieldProps {
  index: number;
  control: Control<EducationFormValues>;
  watch: UseFormWatch<EducationFormValues>;
  remove: (index: number) => void;
  tab: string | undefined;
  setTab: (val: string) => void;
}

export function EducationAchievementItemField({
  index,
  control,
  watch,
  remove,
  tab,
  setTab,
}: EducationAchievementItemFieldProps) {
  const {
    fields,
    append: appendTranslation,
    remove: removeTranslation,
  } = useFieldArray({
    control,
    name: `achievements.${index}.translations`,
  });

  useEffect(() => {
    if (!tab && fields.length > 0) {
      setTab(fields[0].id);
    }
  }, [fields, tab, setTab]);

  return (
    <div className="relative space-y-4 rounded-lg border p-4 pt-8">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2"
        onClick={() => remove(index)}
      >
        <X className="h-4 w-4" />
      </Button>

      <FormField
        control={control}
        name={`achievements.${index}.sortOrder`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sort</FormLabel>
            <Input
              type="number"
              className="w-full"
              value={Number(field.value)}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Number(e.target.value);
                field.onChange(val);
              }}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`achievements.${index}.imageIds`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Images</FormLabel>
            <MediaMultiSelect
              value={field.value ?? []}
              onChange={field.onChange}
            />
          </FormItem>
        )}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className={'mb-2 flex w-full justify-between align-middle'}>
          <TabsList>
            {fields.map((f, i) => {
              const lang = watch(
                `achievements.${index}.translations.${i}.language`
              );

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
              appendTranslation({
                language: 'new',
                title: '',
                content: '',
              })
            }
          >
            <Languages /> Add Language
          </Button>
        </div>

        {fields.map((f, i) => (
          <TabsContent key={f.id} value={f.id}>
            <FormField
              control={control}
              name={`achievements.${index}.translations.${i}.language`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Input {...field} />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`achievements.${index}.translations.${i}.title`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <Input {...field} />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`achievements.${index}.translations.${i}.content`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <Input {...field} value={field.value ?? ''} />
                </FormItem>
              )}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Button
        className={'w-full'}
        type="button"
        size="sm"
        variant="outline"
        onClick={() => remove(index)}
      >
        <Trash /> Remove Achievement Translation
      </Button>
    </div>
  );
}
