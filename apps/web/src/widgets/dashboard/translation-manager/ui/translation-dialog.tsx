'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Form,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import {
  type TranslationFormValues,
  translationSchema,
} from '@/entities/translation/model/translation-schema';
import type { AdminTranslation } from '@/entities/translation/model/types';
import { TextField } from '@/shared/ui';

const emptyValues: TranslationFormValues = {
  key: '',
  language: 'en',
  value: '',
};

export function TranslationDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Nullable<AdminTranslation>;
  onSubmit: (values: TranslationFormValues) => void;
  loading: boolean;
}) {
  const form = useForm<TranslationFormValues>({
    resolver: zodResolver(translationSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        key: initialData.sourceText,
        language: initialData.language,
        value: initialData.translated,
      });
    } else {
      form.reset(emptyValues);
    }
  }, [initialData, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Translation' : 'Create Translation'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <TextField
              control={form.control}
              name="key"
              label="Key"
              placeholder="e.g. global.header.title"
            />

            <TextField
              control={form.control}
              name="language"
              label="Language"
              placeholder="en, vi..."
              className="w-32"
            />

            <TextField
              control={form.control}
              name="value"
              label="Value"
              placeholder="The text shown in the UI"
              multiline
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
