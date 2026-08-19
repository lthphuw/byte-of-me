'use client';

import { type KeyboardEvent, useState } from 'react';
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
import { Reorder, useDragControls } from 'framer-motion';
import {
  ChevronDown,
  GripVertical,
  ImageIcon,
  Trash,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { createScopedImageUploader } from '@/entities/media';
import { MediaMultiSelect } from '@/features/dashboard/media-library/ui/media-multi-select';
import { useRevealOnInvalidSubmit } from '@/shared/hooks/use-reveal-on-invalid-submit';
import { cn } from '@/shared/lib/utils';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

/** Images pasted into this editor land under the `education` prefix in storage. */
const uploadImage = createScopedImageUploader('education');


interface EducationAchievementItemFieldProps {
  /** `useFieldArray` field id — the stable value framer-motion reorders by. */
  id: string;
  index: number;
  total: number;
  control: Control<EducationFormValues>;
  remove: (index: number) => void;
  /** `useFieldArray`'s `move` — the keyboard path onto the same reorder. */
  move: (from: number, to: number) => void;
  defaultOpen?: boolean;
}

export function EducationAchievementItemField({
  id,
  index,
  total,
  control,
  remove,
  move,
  defaultOpen = false,
}: EducationAchievementItemFieldProps) {
  const t = useTranslations('dashboard.education');
  const tShared = useTranslations('dashboard.shared');
  const dragControls = useDragControls();
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

  // A row the user just added and never typed into is not worth a
  // confirmation; both values are already subscribed above, so this is free.
  const hasContent = Boolean(summary) || imageCount > 0;

  const handleRemove = () => {
    if (hasContent) setConfirmingRemove(true);
    else remove(index);
  };

  // Pointer drag is framer-motion's; this is the keyboard half of the same
  // reorder, so the list is not mouse-only.
  const handleGripKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const to =
      event.key === 'ArrowUp'
        ? index - 1
        : event.key === 'ArrowDown'
          ? index + 1
          : null;

    if (to === null || to < 0 || to >= total) return;
    event.preventDefault();
    move(index, to);
  };

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
            onKeyDown={handleGripKeyDown}
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
                          className="rounded-md"
                          // Tiptap reads `value` once, on mount. Rendering is
                          // gated by the language tab and the collapsible above,
                          // so a remount always picks up the current form value.
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
        description={t('achievements.removeConfirmDescription', {
          name: summary || t('achievements.untitled'),
        })}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </Reorder.Item>
  );
}
