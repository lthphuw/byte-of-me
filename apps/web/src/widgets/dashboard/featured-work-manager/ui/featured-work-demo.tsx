'use client';

import { type ChangeEvent, useId, useRef, useState } from 'react';
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
import { uploadSingleMediaRecord } from '@/entities/media/api/upload-single-media';
import { isVideoMimeType } from '@/entities/media/model/upload-constraints';

type DemoItem = NonNullable<FeaturedWorkFormValues['media']>[number];

/** What a slot draws; the form value itself carries only the id and the label. */
type Preview = Pick<AdminFeaturedWorkMedia, 'url' | 'mimeType'>;

const ACCEPT = 'image/*,video/mp4,video/webm';

/** The form value for the demo pair: what the stored pair was, as the owner left it. */
export function toDemoValues(stored: AdminFeaturedWorkMedia[] = []): DemoItem[] {
  return stored.map((item) => ({ mediaId: item.id, label: item.label }));
}

interface FeaturedWorkDemoProps {
  /** The `media` field, from the form's `FormField` (it also scopes the error line). */
  field: ControllerRenderProps<FeaturedWorkFormValues, 'media'>;
  /** The stored pair, for the previews of the clips the form opened with. */
  initialMedia?: AdminFeaturedWorkMedia[];
}

/**
 * The demo pair: not per language, so it sits below the tabs. Slot 1 is offered
 * first and slot 2 only once slot 1 is filled; removing slot 1 moves slot 2 up,
 * so the filled slots are always the array's first entries (the order the server
 * stores). Lives in the form state as `media`: an untouched section re-submits
 * the loaded pair.
 */
export function FeaturedWorkDemo({
  field,
  initialMedia = [],
}: FeaturedWorkDemoProps) {
  const t = useTranslations('dashboard.featuredWorks.demo');
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

  const items: DemoItem[] = field.value ?? [];

  const upload = async (file: File) => {
    setIsUploading(true);
    try {
      const stored = await uploadSingleMediaRecord(file, 'featured-work');
      setPreviews((prev) => ({
        ...prev,
        [stored.id]: { url: stored.url, mimeType: stored.mimeType },
      }));
      // Read at the moment the upload lands: the owner may have edited a label
      // or removed a slot while it was in flight.
      const latest = getValues('media') ?? [];
      if (
        latest.length < FEATURED_WORK_MEDIA_MAX &&
        !latest.some((item) => item.mediaId === stored.id)
      ) {
        field.onChange([...latest, { mediaId: stored.id, label: null }]);
      }
    } catch (error) {
      toast.error(t('uploadFailed'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsUploading(false);
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

  const remove = (index: number) =>
    field.onChange(items.filter((_, i) => i !== index));

  // Filled slots, then the single next empty one (if there is room).
  const slotCount = Math.min(items.length + 1, FEATURED_WORK_MEDIA_MAX);

  return (
    <FormItem role="group" aria-labelledby={headingId}>
      <p id={headingId} className="text-sm font-medium leading-none">
        {t('title')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="flex items-center gap-2">
                <Input
                  value={item.label ?? ''}
                  maxLength={FEATURED_WORK_MEDIA_LABEL_MAX_LENGTH}
                  aria-label={t('labelLabel', { slot })}
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
