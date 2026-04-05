'use client';

import { useEffect } from 'react';
import { Languages, Trash, X } from 'lucide-react';
import { Control, UseFormWatch, useFieldArray } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaMultiSelect } from '@/components/media-multi-select';

interface Props {
  index: number;
  control: Control<any>;
  watch: UseFormWatch<any>;
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
}: Props) {
  const {
    fields,
    append: appendTranslation,
    remove: removeTransaltion,
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
    <div className="p-4 pt-8 border rounded-lg space-y-4 relative">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={() => remove(index)}
      >
        <X className="w-4 h-4" />
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
              value={Number(field.value) ?? 0}
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
        <div className={'flex w-full justify-between align-middle mb-2'}>
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
