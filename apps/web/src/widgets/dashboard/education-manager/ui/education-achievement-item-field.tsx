'use client';

import { useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ConfirmDeleteDialog,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  fromEditorContent,
  toEditorContent,
} from '@byte-of-me/ui';
import { ArrowDown, ArrowUp, ChevronDown, ImageIcon, Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { useScopedImageUploader } from '@/entities/media/query';
import { MediaMultiSelect } from '@/features/dashboard/media-library/ui/media-multi-select';
import { useEditorLabels } from '@/shared/hooks/use-editor-labels';
import { useRevealOnInvalidSubmit } from '@/shared/hooks/use-reveal-on-invalid-submit';
import { cn } from '@/shared/lib/utils';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { achievementHasContent } from '@/widgets/dashboard/education-manager/lib/achievement-has-content';

/** 44px on touch; 36px only with a fine pointer, under `can-hover:`. */
const TOUCH_TARGET = 'min-h-11 min-w-11 can-hover:min-h-9 can-hover:min-w-9';

interface EducationAchievementItemFieldProps {
  index: number;
  total: number;
  control: Control<EducationFormValues>;
  remove: (index: number) => void;
  /** `useFieldArray`'s `move`: the up and down buttons swap with a neighbour. */
  move: (from: number, to: number) => void;
  defaultOpen?: boolean;
}

export function EducationAchievementItemField({
  index,
  total,
  control,
  remove,
  move,
  defaultOpen = false,
}: EducationAchievementItemFieldProps) {
  // Images pasted into this editor land under the `education` prefix in
  // storage.
  const uploadImage = useScopedImageUploader('education');
  const t = useTranslations('dashboard.education');
  const tShared = useTranslations('dashboard.shared');
  const tMedia = useTranslations('dashboard.media');
  const editorLabels = useEditorLabels();
  const [open, setOpen] = useState(defaultOpen);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // These rows are collapsed by default, and a collapsed one UNMOUNTS its
  // fields — so the language tabs inside cannot reveal an invalid field until
  // the card itself is open. Same submit signal, one level up.
  useRevealOnInvalidSubmit(control, `achievements.${index}`, () =>
    setOpen(true)
  );

  // `useWatch`, not `form.watch`: the latter re-renders the whole dialog — and
  // therefore every other achievement's editor — on each keystroke.
  const summary = useWatch({
    control,
    name: `achievements.${index}.translations.0.title`,
  });
  const imageIds = useWatch({
    control,
    name: `achievements.${index}.imageIds`,
  });
  const imageCount = imageIds?.length ?? 0;
  const name = summary || t('achievements.untitled');

  // `compute` re-renders only when the answer flips, not on every keystroke.
  const hasContent = useWatch({
    control,
    name: `achievements.${index}`,
    compute: achievementHasContent,
  });

  const handleRemove = () => {
    if (hasContent) setConfirmingRemove(true);
    else remove(index);
  };

  return (
    <div className="rounded-lg border bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1 p-2">
          <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {index + 1}
          </span>

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded px-1 py-1.5 text-left transition-colors hover:bg-muted/50 can-hover:min-h-8"
            >
              {/* `min-w-0` is what lets `truncate` actually clip: without it
                  a nowrap flex item refuses to shrink below its text width and
                  widens the whole dialog. */}
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm font-medium',
                  !summary && 'text-muted-foreground'
                )}
              >
                {name}
              </span>

              {imageCount > 0 && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 px-1.5 py-0 text-[10px]"
                >
                  <ImageIcon className="h-2.5 w-2.5" />
                  {imageCount}
                </Badge>
              )}

              <ChevronDown
                className={cn(
                  'ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  open && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('achievements.moveUpLabel', { name })}
            disabled={index === 0}
            className={cn('shrink-0 text-muted-foreground', TOUCH_TARGET)}
            onClick={() => move(index, index - 1)}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('achievements.moveDownLabel', { name })}
            disabled={index === total - 1}
            className={cn('shrink-0 text-muted-foreground', TOUCH_TARGET)}
            onClick={() => move(index, index + 1)}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('achievements.removeAriaLabel')}
            className={cn(
              'shrink-0 text-muted-foreground hover:text-destructive-text',
              TOUCH_TARGET
            )}
            onClick={handleRemove}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>

        {/* Padding lives on the inner element: the animated one goes from
            height 0, and padding on it would jump the first frame. */}
        <CollapsibleContent>
          <div className="space-y-4 border-t p-4">
            <FormField
              control={control}
              name={`achievements.${index}.imageIds`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('achievements.imagesLabel')}</FormLabel>
                  <FormControl>
                    <MediaMultiSelect
                      value={field.value ?? []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <TranslationTabs
              control={control}
              name={`achievements.${index}.translations`}
              newTranslation={() => ({ language: '', title: '', content: '' })}
              renderFields={(i) => (
                <>
                  <TextField
                    control={control}
                    name={`achievements.${index}.translations.${i}.title`}
                    label={t('achievements.titleLabel')}
                  />

                  <FormField
                    control={control}
                    name={`achievements.${index}.translations.${i}.content`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('achievements.contentLabel')}</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            compact
                            minHeight={140}
                            placeholder={t('achievements.contentPlaceholder')}
                            // Tiptap reads `value` once, on mount. Rendering is
                            // gated by the language tab and the collapsible above,
                            // so a remount always picks up the current form value.
                            value={toEditorContent(field.value)}
                            onChange={(json) =>
                              field.onChange(fromEditorContent(json))
                            }
                            uploadImage={uploadImage}
                            labels={editorLabels}
                            uploadFailedText={tMedia('toast.uploadError')}
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
        </CollapsibleContent>
      </Collapsible>

      <ConfirmDeleteDialog
        isOpen={confirmingRemove}
        onClose={() => setConfirmingRemove(false)}
        onConfirm={() => {
          setConfirmingRemove(false);
          remove(index);
        }}
        title={t('achievements.removeConfirmTitle')}
        description={t('achievements.removeConfirmDescription', { name })}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
