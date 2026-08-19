'use client';

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
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import type { AdminEducation } from '@/entities/education';
import {
  type EducationFormValues,
  educationSchema,
} from '@/entities/education/model/education-schema';
import { createScopedImageUploader } from '@/entities/media';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { useResetOnOpen } from '@/shared/hooks/use-reset-on-open';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

/** Images pasted into this editor land under the `education` prefix in storage. */
const uploadImage = createScopedImageUploader('education');

/**
 * The achievements list pulls framer-motion's `Reorder`/`useDragControls`,
 * which need the projection/layout system — the heavy half of the library, and
 * far heavier than the `m` import the rest of the app uses. It only ever
 * renders inside this dialog's `DialogContent`, which Radix does not mount
 * while closed, so loading it lazily keeps drag-and-drop out of the
 * `/dashboard/educations` first paint.
 */
const EducationAchievementsField = dynamic(
  () =>
    import(
      '@/widgets/dashboard/education-manager/ui/education-achievements-field'
    ).then((mod) => mod.EducationAchievementsField),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] w-full animate-pulse rounded-md border bg-muted/30" />
    ),
  }
);

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
  const t = useTranslations('dashboard.education');
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
  const handleValid = (values: EducationFormValues) =>
    onSubmit({
      ...values,
      achievements: values.achievements.map((achievement, index) => ({
        ...achievement,
        sortOrder: index,
      })),
    });

  // No `onInvalid` handler revealing the erroring language tab: TranslationTabs
  // subscribes to its own errors and reveals itself, at every nesting level.
  const handleSubmit = form.handleSubmit(handleValid);

  useResetOnOpen(form, open, initialData, (data) => ({
    id: data.id,
    sortOrder: data.sortOrder ?? 0,
    startDate: data.startDate ? new Date(data.startDate) : new Date(),
    endDate: data.endDate ? new Date(data.endDate) : null,
    logoId: data.logoId ?? null,

    translations:
      data.translations?.length > 0
        ? data.translations
        : [{ language: 'en', title: '', description: '' }],

    achievements:
      data.achievements?.map((a) => ({
        id: a.id,
        sortOrder: a.sortOrder ?? 0,
        translations:
          a.translations?.length > 0
            ? a.translations
            : [{ language: 'en', title: '', content: '' }],
        imageIds: a.images?.map((it) => it.mediaId) ?? [],
      })) ?? [],
  }));

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
            {initialData ? t('dialog.editTitle') : t('dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? t('dialog.editDescription')
              : t('dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-w-0 flex-1 space-y-8 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="logoId"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t('dialog.logoLabel')}</FormLabel>
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
                    <FormLabel>{t('dialog.startDateLabel')}</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.endDateLabel')}</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(d) => field.onChange(d || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <section className="space-y-4 border-t pt-6">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  {t('dialog.translationsTitle')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('dialog.translationsDescription')}
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
                      label={t('dialog.schoolLabel')}
                    />

                    <FormField
                      control={form.control}
                      name={`translations.${i}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('dialog.descriptionLabel')}</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              compact
                              minHeight={140}
                              placeholder={t('dialog.descriptionPlaceholder')}
                              className="rounded-md"
                              value={toEditorContent(field.value)}
                              onChange={(json) =>
                                field.onChange(fromEditorContent(json))
                              }
                              uploadImage={uploadImage}
                            />
                          </FormControl>
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
                {t('dialog.cancelButton')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData
                  ? t('dialog.saveButton')
                  : t('dialog.createSubmitButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
