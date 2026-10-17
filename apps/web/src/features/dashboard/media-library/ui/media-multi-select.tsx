'use client';

import { useMemo, useState } from 'react';
import { isImageMimeType } from '@byte-of-me/contracts/media';
import {
  Button,
  type ButtonProps,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '@byte-of-me/ui';
import { Check, ChevronDown, ImageIcon, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { useMediaInfiniteQuery } from '@/entities/media/query';
import { useWorkspaceSettings } from '@/entities/workspace-settings/query';
import { MediaPickerGrid } from '@/features/dashboard/media-library/ui/media-picker-grid';
import { MediaPickerUploadDialog } from '@/features/dashboard/media-library/ui/media-picker-upload-dialog';
import { cn } from '@/shared/lib/utils';
import { AddButton } from '@/shared/ui';

type MediaMultiSelectProps = Omit<
  ButtonProps,
  'value' | 'onChange' | 'children' | 'asChild'
> & {
  value?: string[];
  onChange: (ids: string[]) => void;
};

export function MediaMultiSelect({
  value = [],
  onChange,
  className,
  // `id` and the aria-* attributes arrive from <FormControl>'s Slot; dropping
  // them left <FormLabel htmlFor> pointing at nothing and the error unlinked.
  ...triggerProps
}: MediaMultiSelectProps) {
  const t = useTranslations('dashboard.media');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const library = useMediaInfiniteQuery();
  const { imageCompression } = useWorkspaceSettings();

  // The library also holds demo clips; a picker draws an `<img>`, so it lists images only.
  const allMedia = useMemo(
    () =>
      (library.data?.pages.flatMap((page) => page?.data ?? []) || []).filter(
        (media) => isImageMimeType(media.mimeType)
      ),
    [library.data]
  );

  const selectedMedia = allMedia.filter((m) => value.includes(m?.id));

  const toggleSelect = (id: string) => {
    const nextValue = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id];
    onChange(nextValue);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          {...triggerProps}
          className={cn(
            'min-h-[56px] w-full justify-between border-2 border-dashed px-3 hover:border-primary hover:bg-primary/5',
            className
          )}
        >
          <div className="flex flex-wrap items-center gap-2 py-1">
            {selectedMedia.length > 0 ? (
              selectedMedia.slice(0, 3).map((media) => (
                <div
                  key={media.id}
                  className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-background"
                >
                  <Image
                    src={media.url}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    alt={media.fileName}
                  />
                </div>
              ))
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted">
                <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}

            <div className="ml-2 flex flex-col items-start text-left">
              <span className="text-sm font-medium">
                {value.length > 0
                  ? t('picker.selectedCount', { count: value.length })
                  : t('picker.selectMedia')}
              </span>
              <span className="text-xs text-muted-foreground">
                {value.length > 3
                  ? t('picker.moreCount', { count: value.length - 3 })
                  : t('picker.clickToManage')}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(400px,calc(100vw-2rem))] p-0"
        align="start"
      >
        <div className="flex items-center justify-between border-b bg-muted/30 p-3">
          <span className="text-xs font-bold uppercase text-muted-foreground">
            {t('picker.libraryLabel')}
          </span>
          <div className="flex gap-2">
            {value.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11 px-2 text-xs hover:text-destructive-text can-hover:min-h-9"
                onClick={() => onChange([])}
              >
                {t('picker.clearAll')}
              </Button>
            )}
            <AddButton
              label={t('picker.uploadButton')}
              onClick={() => setIsUploadOpen(true)}
              className="gap-1 px-2 text-xs"
            />
            <MediaPickerUploadDialog
              open={isUploadOpen}
              onOpenChange={setIsUploadOpen}
              compressionConfig={imageCompression}
            />
          </div>
        </div>

        {selectedMedia.length > 0 && (
          <ScrollArea className="max-h-24 border-b bg-background">
            <div className="flex flex-wrap gap-2 p-3">
              {selectedMedia.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  aria-label={t('upload.removeFile', { name: media.fileName })}
                  onClick={() => toggleSelect(media.id)}
                  className="relative size-11 shrink-0 overflow-hidden rounded border"
                >
                  <Image
                    src={media.url}
                    width={44}
                    height={44}
                    className="size-full object-cover"
                    alt=""
                  />
                  <span
                    aria-hidden
                    className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background"
                  >
                    <X className="size-3" />
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <ScrollArea className="h-80">
          <div className="p-3">
            <MediaPickerGrid query={library} isEmpty={allMedia.length === 0}>
              {allMedia.map((media) => {
                const isSelected = value.includes(media.id);
                return (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => toggleSelect(media.id)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-md border-2 transition-[border-color,box-shadow]',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-primary/50'
                    )}
                  >
                    <Image
                      src={media.url}
                      fill
                      sizes="120px"
                      className="h-full w-full object-cover"
                      alt={media.fileName}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <div className="rounded-full bg-primary p-0.5 text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </MediaPickerGrid>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
