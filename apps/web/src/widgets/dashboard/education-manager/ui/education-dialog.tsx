'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  fromEditorContent,
  Icons,
  toEditorContent,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';

import { uploadSingleMedia } from '@/entities';
import type { AdminEducation } from '@/entities/education';
import {
  type EducationFormValues,
  educationSchema,
} from '@/entities/education/model/education-schema';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { EducationAchievementsField } from '@/widgets/dashboard/education-manager/ui/education-achievements-field';

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

  // Achievement order is whatever the list shows, so `sortOrder` is stamped
  // from the position at submit time rather than tracked as an editable field.
  const handleSubmit = (values: EducationFormValues) =>
    onSubmit({
      ...values,
      achievements: values.achievements.map((achievement, index) => ({
        ...achievement,
        sortOrder: index,
      })),
    });

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
      {/* Header and footer stay put; only the field area scrolls, so the title
          and Save button are always reachable in a form this tall.
          `min-w-0` on the scrolling body is load-bearing: without it the flex
          item takes its automatic minimum size from the widest descendant —
          the editor toolbar's ~990px button row — and drags the whole dialog
          wider than its own max-width. With it, the toolbar scrolls inside its
          own ScrollArea, which is what it was built to do. */}
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle>
            {initialData ? 'Edit education' : 'Add education'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update this entry and the achievements listed under it.'
              : 'Add a school or degree, then list what you achieved there.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-w-0 flex-1 space-y-8 overflow-y-auto px-6 py-5">
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

            <section className="space-y-4 border-t pt-6">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Translations</h3>
                <p className="text-xs text-muted-foreground">
                  One tab per language. Visitors see the tab matching their
                  locale.
                </p>
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

                    <FormField
                      control={form.control}
                      name={`translations.${i}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <RichTextEditor
                            compact
                            minHeight={140}
                            placeholder="A short summary of this program…"
                            className="rounded-md"
                            value={toEditorContent(field.value)}
                            onChange={(json) =>
                              field.onChange(fromEditorContent(json))
                            }
                            uploadImage={uploadSingleMedia}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              />
            </section>

            <EducationAchievementsField control={form.control} />
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData ? 'Save changes' : 'Add education'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
