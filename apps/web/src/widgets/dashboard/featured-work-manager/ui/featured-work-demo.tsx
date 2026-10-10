'use client';

import { type ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { type ControllerRenderProps, useFormContext } from 'react-hook-form';
import { Button, FormItem, FormMessage, Input } from '@byte-of-me/ui';
import { Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { AdminFeaturedWorkMedia } from '@/entities/featured-work';
import {
  FEATURED_WORK_MEDIA_LABEL_MAX_LENGTH,
  FEATURED_WORK_MEDIA_MAX,
  type FeaturedWorkFormValues,
} from '@/entities/featured-work/model/featured-work-schema';
import {
  ACCEPTED_MEDIA_MIME_TYPES,
  isVideoMimeType,
  MediaViolationError,
  uploadSingleMediaRecord,
} from '@/entities/media';

type DemoItem = NonNullable<FeaturedWorkFormValues['media']>[number];

/** What a slot draws; the form value itself carries only the id and the label. */
type Preview = Pick<AdminFeaturedWorkMedia, 'url' | 'mimeType'>;

const ACCEPT = ACCEPTED_MEDIA_MIME_TYPES.join(',');

/** The form value for the demo pair: what the stored pair was, as the owner left it. */
export function toDemoValues(
  stored: AdminFeaturedWorkMedia[] = []
): DemoItem[] {
  return stored.map((item) => ({ mediaId: item.id, label: item.label }));
}

interface FeaturedWorkDemoProps {
  /** The `media` field, from the form's `FormField` (it also scopes the error line). */
  field: ControllerRenderProps<FeaturedWorkFormValues, 'media'>;
  /** The stored pair, for the previews of the clips the form opened with. */
  initialMedia?: AdminFeaturedWorkMedia[];
  /** True while a clip is uploading: the form must not be saved until it lands. */
  onUploadingChange?: (isUploading: boolean) => void;
}

/**
 * The demo pair, below the language tabs. Slot 2 is offered once slot 1 is filled,
 * and filled slots are always the array's first entries (the order the server stores).
 */
export function FeaturedWorkDemo({
  field,
  initialMedia = [],
  onUploadingChange,
}: FeaturedWorkDemoProps) {
  const t = useTranslations('dashboard.featuredWorks.demo');
  const tMedia = useTranslations('dashboard.media');
  const headingId = useId();
  const { getValues } = useFormContext<FeaturedWorkFormValues>();

  const [previews, setPreviews] = useState<Record<string, Preview>>(() =>
    Object.fromEntries(
      initialMedia.map((item) => [
        item.id,
        { url: item.url, mimeType: item.mimeType },
      ])
    )
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const isUploadingRef = useRef(false);
  // Which control takes focus once the slots have re-rendered: `label-0`, `upload-1`...
  const focusAfter = useRef<string | null>(null);

  const items: DemoItem[] = field.value ?? [];

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  // The form's Save is held while a clip is in flight; unmounting releases it.
  useEffect(() => {
    onUploadingChange?.(isUploading);
    return () => onUploadingChange?.(false);
  }, [isUploading, onUploadingChange]);

  // A removed or disabled control drops focus to <body>; hand it on, unless the
  // owner has already moved to something else.
  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    const active = document.activeElement;
    if (
      active &&
      active !== document.body &&
      !container.current?.contains(active)
    ) {
      return;
    }
    container.current
      ?.querySelector<HTMLElement>(`[data-demo-focus="${target}"]`)
      ?.focus();
  });

  const toastUploadError = (error: unknown) => {
    const title = tMedia('toast.uploadError');
    if (!(error instanceof MediaViolationError)) {
      toast.error(title, {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }
    const { violation } = error;
    switch (violation.kind) {
      case 'type':
        toast.error(tMedia('upload.invalidTypeTitle'), {
          description: tMedia('upload.invalidMediaTypeDescription', {
            fileName: violation.fileName,
          }),
        });
        return;
      case 'size':
        toast.error(tMedia('upload.fileTooLargeTitle'), {
          description: tMedia('upload.fileTooLargeDescription', {
            fileName: violation.fileName,
            maxSize: violation.maxSizeMb,
          }),
        });
        return;
      case 'total':
        toast.error(tMedia('upload.totalTooLargeTitle'), {
          description: tMedia('upload.totalTooLargeDescription', {
            maxSize: violation.maxSizeMb,
          }),
        });
        return;
      case 'batch':
        toast.error(tMedia('upload.tooManyFilesTitle'), {
          description: tMedia('upload.tooManyFilesDescription', {
            max: violation.max,
          }),
        });
    }
  };

  const upload = async (file: File) => {
    if (isUploadingRef.current) return;
    isUploadingRef.current = true;
    setIsUploading(true);
    try {
      const stored = await uploadSingleMediaRecord(file, 'featured-work');
      // The form may have closed while the file was on its way: nothing to attach to.
      if (!isMounted.current) return;
      setPreviews((prev) => ({
        ...prev,
        [stored.id]: { url: stored.url, mimeType: stored.mimeType },
      }));
      // Read as the upload lands: the owner may have edited a label or removed a
      // slot meanwhile.
      const latest = getValues('media') ?? [];
      if (
        latest.length < FEATURED_WORK_MEDIA_MAX &&
        !latest.some((item) => item.mediaId === stored.id)
      ) {
        focusAfter.current = `label-${latest.length}`;
        field.onChange([...latest, { mediaId: stored.id, label: null }]);
      } else {
        toast.error(tMedia('toast.uploadError'));
      }
    } catch (error) {
      toastUploadError(error);
      focusAfter.current = `upload-${(getValues('media') ?? []).length}`;
    } finally {
      isUploadingRef.current = false;
      if (isMounted.current) setIsUploading(false);
    }
  };

  const onFileChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again after a failure fires `change`.
    event.target.value = '';
    if (file) void upload(file);
  };

  const setLabel = (index: number, label: string) =>
    field.onChange(
      items.map((item, i) => (i === index ? { ...item, label } : item))
    );

  const remove = (index: number) => {
    // The control now at this slot: the clip that moved up, or the empty slot.
    const next = items[index + 1] ? `label-${index}` : `upload-${index}`;
    focusAfter.current = next;
    field.onChange(items.filter((_, i) => i !== index));
  };

  // Filled slots, then the single next empty one (if there is room).
  const slotCount = Math.min(items.length + 1, FEATURED_WORK_MEDIA_MAX);

  return (
    <FormItem role="group" aria-labelledby={headingId}>
      <p id={headingId} className="text-sm font-medium leading-none">
        {t('title')}
      </p>

      <div ref={container} className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: slotCount }, (_, index) => {
          const slot = index + 1;
          const item = items[index];
          const preview = item ? previews[item.mediaId] : undefined;

          if (!item) {
            return (
              <Button
                key={`empty-${slot}`}
                type="button"
                variant="outline"
                aria-label={t('uploadLabel', { slot })}
                aria-busy={isUploading}
                disabled={isUploading}
                data-demo-focus={`upload-${index}`}
                onClick={() => fileInput.current?.click()}
                className="aspect-video h-auto w-full flex-col gap-2 border-dashed bg-card"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                {t('uploadButton')}
              </Button>
            );
          }

          return (
            <div key={item.mediaId} className="min-w-0 space-y-2">
              <div className="aspect-video overflow-hidden rounded-md border bg-muted">
                {preview &&
                  (isVideoMimeType(preview.mimeType) ? (
                    <video
                      src={preview.url}
                      muted
                      loop
                      playsInline
                      controls
                      preload="metadata"
                      aria-label={t('previewLabel', { slot })}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.url}
                      alt={t('previewLabel', { slot })}
                      className="h-full w-full object-contain"
                    />
                  ))}
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  value={item.label ?? ''}
                  maxLength={FEATURED_WORK_MEDIA_LABEL_MAX_LENGTH}
                  aria-label={t('labelLabel', { slot })}
                  data-demo-focus={`label-${index}`}
                  className="min-w-0"
                  onChange={(event) => setLabel(index, event.target.value)}
                  onBlur={field.onBlur}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1"
                  aria-label={t('removeLabel', { slot })}
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                  {t('removeButton')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={onFileChosen}
      />
      <FormMessage />
    </FormItem>
  );
}
