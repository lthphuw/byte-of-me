'use client';

import type { Control } from 'react-hook-form';
import type { BlogFormValues } from '@byte-of-me/contracts/blog';
import {
  Button,
  Checkbox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  type MultiSelectOption,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import type { ProjectOption } from '@/entities/project/api/get-admin-project-options';
import type { PickerState } from '@/features/dashboard/blog-editor/lib/use-blog-reference-options';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { FieldMessage, LocalizedMultiSelect, TextField } from '@/shared/ui';

interface BlogMetaFieldsProps {
  control: Control<BlogFormValues>;
  projects: ProjectOption[];
  projectsState: PickerState;
  tagOptions: MultiSelectOption[];
  tagsState: PickerState;
}

/** Everything above the translation tabs: slug, relations, flags, cover. */
export function BlogMetaFields({
  control,
  projects,
  projectsState,
  tagOptions,
  tagsState,
}: BlogMetaFieldsProps) {
  const t = useTranslations('dashboard.blog');
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <TextField
          control={control}
          name="slug"
          label={t('meta.slugLabel')}
          placeholder={t('meta.slugPlaceholder')}
        />

        <FormField
          control={control}
          name="projectId"
          render={({ field }) =>
            projectsState.isLoading ? (
              <PickerSkeleton />
            ) : projectsState.isError ? (
              <PickerError
                label={t('meta.projectLabel')}
                onRetry={projectsState.retry}
              />
            ) : (
              <FormItem>
                <FormLabel>{t('meta.projectLabel')}</FormLabel>
                {/* FormControl wraps the trigger, not Select's root: the root
                    renders no DOM, so `id`/`aria-*` fell on the floor and the
                    label pointed at nothing. */}
                <Select
                  onValueChange={field.onChange}
                  value={field.value || 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('meta.projectPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">
                      {t('meta.projectNone')}
                    </SelectItem>

                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldMessage />
              </FormItem>
            )
          }
        />

        <FormField
          control={control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 can-hover:items-start">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                {/* The label is the tap target; the 16px checkbox alone is not one. */}
                <FormLabel className="flex min-h-11 items-center can-hover:inline">
                  {t('meta.publishedLabel')}
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <FormField
          control={control}
          name="coverImageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('meta.coverImageLabel')}</FormLabel>
              <FormControl>
                <MediaSelect
                  value={field.value ?? undefined}
                  onChange={(media) => field.onChange(media?.id)}
                />
              </FormControl>
              <FieldMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="tagIds"
          render={({ field }) =>
            tagsState.isLoading ? (
              <PickerSkeleton />
            ) : tagsState.isError ? (
              <PickerError
                label={t('meta.tagsLabel')}
                onRetry={tagsState.retry}
              />
            ) : (
              <FormItem>
                <FormLabel>{t('meta.tagsLabel')}</FormLabel>
                <FormControl>
                  <LocalizedMultiSelect
                    options={tagOptions}
                    selected={field.value || []}
                    onValueChange={field.onChange}
                    placeholder={t('meta.tagsPlaceholder')}
                  />
                </FormControl>
                <FieldMessage />
              </FormItem>
            )
          }
        />
      </div>
    </div>
  );
}

/** A picker's place while its options load: a label line over a select-height bar. */
function PickerSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/** A picker whose options failed. Never an empty select, which reads as "none exist". */
function PickerError({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  const t = useTranslations('dashboard.blog');
  const tShared = useTranslations('dashboard.shared');

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none">{label}</p>
      <div className="flex items-center gap-2 text-[0.8rem] font-medium text-destructive-text">
        <span>{t('meta.optionsError')}</span>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          {tShared('managerListState.retry')}
        </Button>
      </div>
    </div>
  );
}
