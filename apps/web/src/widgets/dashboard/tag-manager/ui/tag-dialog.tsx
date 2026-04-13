'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { type TagFormValues,tagSchema } from '@/entities/tag/model/tag-schema';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';

import { zodResolver } from '@hookform/resolvers/zod';

export function TagDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: any) {
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      slug: '',
      translations: [{ language: 'en', name: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        slug: initialData.slug,
        translations: initialData.translations.map((t: any) => ({
          id: t.id,
          language: t.language,
          name: t.name,
        })),
      });
    } else {
      form.reset({
        slug: '',
        translations: [{ language: 'en', name: '' }],
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: TagFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit PublicTag' : 'Create PublicTag'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          {/* Slug */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Slug</label>
            <Input {...form.register('slug')} placeholder="reactjs" />
          </div>

          {/* Translations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Translations</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ language: '', name: '' })}
              >
                Add
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center gap-2 rounded-lg border p-2"
              >
                <Input
                  {...form.register(`translations.${index}.language`)}
                  placeholder="en"
                  className="w-20"
                />

                <Input
                  {...form.register(`translations.${index}.name`)}
                  placeholder="React"
                  className="flex-1"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
