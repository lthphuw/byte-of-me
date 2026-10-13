'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  type ButtonProps,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '@byte-of-me/ui';
import { Check, ChevronDown, ImageIcon, Plus } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { isImageMimeType } from '@/entities/media/model/upload-constraints';
import { useMediaInfiniteQuery } from '@/entities/media/query';
import { useWorkspaceSettings } from '@/entities/workspace-settings/query';
import { MediaPickerGrid } from '@/features/dashboard/media-library/ui/media-picker-grid';
import { MediaPickerUploadDialog } from '@/features/dashboard/media-library/ui/media-picker-upload-dialog';
import { cn } from '@/shared/lib/utils';
import type { Media } from '@/shared/types/models';

type MediaSelectProps = Omit<
  ButtonProps,
  'value' | 'onChange' | 'children' | 'asChild'
> & {
  value?: string | null;
  onChange: (media: Media | null) => void;
};

export function MediaSelect({
  value,
  onChange,
  className,
  // `id` and the aria-* attributes arrive from <FormControl>'s Slot; dropping
  // them left <FormLabel htmlFor> pointing at nothing and the error unlinked.
  ...triggerProps
}: MediaSelectProps) {
  const t = useTranslations('dashboard.media');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [open, setOpen] = useState(false);
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
  const selectedMedia = allMedia.find((m) => m?.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          {...triggerProps}
          className={cn(
            'h-14 w-full justify-between border-2 border-dashed px-3 hover:border-primary hover:bg-primary/5',
            className
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-background">
              {selectedMedia ? (
                <Image
                  src={selectedMedia.url}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  alt={t('picker.selectedAlt')}
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex flex-col items-start truncate text-left">
              <span className="w-full truncate text-sm font-medium">
                {selectedMedia
                  ? selectedMedia.fileName
                  : t('picker.selectMedia')}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedMedia
                  ? t('picker.clickToChange')
                  : t('picker.chooseFromLibrary')}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(400px,calc(100vw-2rem))] p-0 shadow-xl"
        align="start"
      >
        <div className="flex items-center justify-between border-b bg-muted/30 p-3">
          <span className="text-xs font-bold uppercase text-muted-foreground">
            {t('picker.libraryLabel')}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="min-h-11 gap-1 text-xs text-primary can-hover:min-h-9"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus className="h-3 w-3" /> {t('picker.uploadButton')}
          </Button>
          <MediaPickerUploadDialog
            open={isUploadOpen}
            onOpenChange={setIsUploadOpen}
            compressionConfig={imageCompression}
          />
        </div>

        <ScrollArea className="h-80">
          <div className="p-3">
            <MediaPickerGrid query={library} isEmpty={allMedia.length === 0}>
              {allMedia.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => {
                    onChange(media);
                    setOpen(false); // Close on selection
                  }}
                  className={cn(
                    'relative aspect-square overflow-hidden rounded-md border-2 transition-[border-color,box-shadow]',
                    value === media.id
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
                  {value === media.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </MediaPickerGrid>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
