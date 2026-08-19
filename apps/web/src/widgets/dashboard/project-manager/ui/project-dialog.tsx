'use client';

import { useForm } from 'react-hook-form';
import { Button ,
  Checkbox,
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
  FormMessage, fromEditorContent, MultiSelect, toEditorContent } from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { ProjectCoauthorFields } from './project-coauthor-fields';

import { createScopedImageUploader } from '@/entities/media';
import {
  type AdminProject,
  type ProjectFromValues,
  projectSchema,
} from '@/entities/project/model';
import { useResetOnOpen } from '@/shared/hooks/use-reset-on-open';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { useProjectReferenceOptions } from '@/widgets/dashboard/project-manager/lib/use-project-reference-options';

/** Images pasted into this editor land under the `project` prefix in storage. */
const uploadImage = createScopedImageUploader('project');


interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Nullable<AdminProject>;
  onSubmit: (values: ProjectFromValues) => void;
  loading: boolean;
}

export function ProjectDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: ProjectDialogProps) {
  const t = useTranslations('dashboard.project');
  const { tagOptions, techOptions } = useProjectReferenceOptions(open);

  const form = useForm<ProjectFromValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      slug: '',
      githubLink: '',
      liveLink: '',
      startDate: '',
      endDate: '',
      isPublished: false,
      techStackIds: [],
      tagIds: [],
      coauthors: [],
      translations: [{ language: 'en', title: '', description: '' }],
    },
  });

  useResetOnOpen(form, open, initialData, (data) => ({
    ...data,
    githubLink: data.githubLink || '',
    liveLink: data.liveLink || '',
    // <input type="date"> only accepts yyyy-MM-dd — a full ISO string
    // renders as an empty field.
    startDate: data.startDate?.toISOString().slice(0, 10) || '',
    endDate: data.endDate?.toISOString().slice(0, 10) || '',
    isPublished: data.isPublished,
    techStackIds: data.techStacks?.map((t) => t.techStackId) || [],
    tagIds: data.tags?.map((t) => t.tagId) || [],
    coauthors:
      data.coauthors?.map((c) => ({
        fullName: c.coauthor.fullName,
        email: c.coauthor.email || '',
      })) || [],
    translations: data.translations.map((t) => ({
      language: t.language,
      title: t.title,
      description: t.description || '',
    })),
  }));

  // No `onInvalid` handler revealing the erroring language tab: TranslationTabs
  // subscribes to its own errors and reveals itself, at every nesting level.
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Same shell as the education dialog: fixed header and footer around a
          scrolling body. `min-w-0` on that body is load-bearing — without it
          the flex item sizes to the editor toolbar's button row and drags the
          dialog past its own max-width (horizontal overflow). */}
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
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
            <div className="min-w-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                control={form.control}
                name="slug"
                label={t('dialog.slugLabel')}
                placeholder={t('dialog.slugPlaceholder')}
              />
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  control={form.control}
                  name="startDate"
                  label={t('dialog.startDateLabel')}
                  type="date"
                />
                <TextField
                  control={form.control}
                  name="endDate"
                  label={t('dialog.endDateLabel')}
                  type="date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                control={form.control}
                name="githubLink"
                label={t('dialog.githubLinkLabel')}
                placeholder={t('dialog.githubLinkPlaceholder')}
              />
              <TextField
                control={form.control}
                name="liveLink"
                label={t('dialog.liveLinkLabel')}
                placeholder={t('dialog.liveLinkPlaceholder')}
              />
            </div>

            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t('dialog.publishedLabel')}</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="techStackIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.techStackLabel')}</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={techOptions}
                        selected={field.value || []}
                        onValueChange={field.onChange}
                        placeholder={t('dialog.techStackPlaceholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags Selection */}
              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.tagsLabel')}</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={tagOptions}
                        selected={field.value || []}
                        onValueChange={field.onChange}
                        placeholder={t('dialog.tagsPlaceholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <ProjectCoauthorFields control={form.control} />

            <div className="space-y-4 border-t pt-4">
              <span className="text-sm font-medium">
                {t('dialog.translationsLabel')}
              </span>

              <TranslationTabs
                control={form.control}
                name="translations"
                newTranslation={() => ({
                  language: '',
                  title: '',
                  description: '',
                })}
                renderFields={(index) => (
                  <>
                    <TextField
                      control={form.control}
                      name={`translations.${index}.title`}
                      label={t('dialog.titleLabel')}
                    />
                    <FormField
                      control={form.control}
                      name={`translations.${index}.description`}
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
            </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => onOpenChange(false)}
              >
                {t('dialog.cancelButton')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto"
              >
                {loading ? t('dialog.savingButton') : t('dialog.saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
