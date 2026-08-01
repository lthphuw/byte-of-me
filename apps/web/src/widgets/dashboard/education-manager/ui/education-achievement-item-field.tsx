'use client';

import { useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  fromEditorContent,
  toEditorContent,
} from '@byte-of-me/ui';
import { Reorder, useDragControls } from 'framer-motion';
import {
  ChevronDown,
  GripVertical,
  ImageIcon,
  Trash,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { uploadSingleMedia } from '@/entities/media';
import { MediaMultiSelect } from '@/features/dashboard/media-library/ui/media-multi-select';
import { cn } from '@/shared/lib/utils';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

interface EducationAchievementItemFieldProps {
  /** `useFieldArray` field id — the stable value framer-motion reorders by. */
  id: string;
  index: number;
  total: number;
  control: Control<EducationFormValues>;
  remove: (index: number) => void;
  defaultOpen?: boolean;
}

export function EducationAchievementItemField({
  id,
  index,
  total,
  control,
  remove,
  defaultOpen = false,
}: EducationAchievementItemFieldProps) {
  const t = useTranslations('dashboard.education');
  const dragControls = useDragControls();
  const [open, setOpen] = useState(defaultOpen);

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

  return (
    <Reorder.Item
      as="div"
      value={id}
      // Only the grip handle starts a drag, so text selection and the rich
      // text editor inside the card keep working normally.
      dragListener={false}
      dragControls={dragControls}
      // Position only. The default `layout` also animates size, which framer
      // does with a transform — so expanding the card would stretch and squash
      // its contents while the collapsible's own height animation runs. This
      // keeps the reorder animation and the expand animation from fighting.
      layout="position"
      className="rounded-lg border bg-card transition-shadow"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1 p-2">
          <button
            type="button"
            aria-label={t('achievements.reorderAriaLabel', {
              index: index + 1,
              total,
            })}
            onPointerDown={(event) => dragControls.start(event)}
            // `touch-none` stops a touch drag from scrolling the dialog
            // instead of moving the card.
            className="flex h-8 w-6 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {index + 1}
          </span>

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1.5 text-left transition-colors hover:bg-muted/50"
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
                {summary || t('achievements.untitled')}
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
            aria-label={t('achievements.removeAriaLabel')}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => remove(index)}
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
                <MediaMultiSelect
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
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
                      <RichTextEditor
                        compact
                        minHeight={140}
                        placeholder={t('achievements.contentPlaceholder')}
                        className="rounded-md"
                        // Tiptap reads `value` once, on mount. Rendering is
                        // gated by the language tab and the collapsible above,
                        // so a remount always picks up the current form value.
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Reorder.Item>
  );
}
