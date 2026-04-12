'use client';

import { Check, ChevronDown, ImageIcon, Loader2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useMediaInfiniteQuery, useMediaUpload } from '@/entities/media';
import type { Media } from '@/entities/media/model/types';
import { ImageUpload } from '@/features/dashboard/media-library/ui/image-upload';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface MediaSelectProps {
  value?: string | null;
  onChange: (media: Media | null) => void;
}

export function MediaSelect({ value, onChange }: MediaSelectProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMediaInfiniteQuery(12);
  const uploadMutation = useMediaUpload();

  const allMedia = useMemo(
    () => data?.pages.flatMap((page) => page?.data ?? []) || [],
    [data]
  );
  const selectedMedia = allMedia.find((m) => m?.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="hover:border-primary hover:bg-primary/5 h-14 w-full justify-between border-2 border-dashed px-3 transition-all"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-background flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border">
              {selectedMedia ? (
                <img
                  src={selectedMedia.url}
                  className="h-full w-full object-cover"
                  alt="Selected"
                />
              ) : (
                <ImageIcon className="text-muted-foreground/40 h-5 w-5" />
              )}
            </div>
            <div className="flex flex-col items-start truncate text-left">
              <span className="w-full truncate text-sm font-medium">
                {selectedMedia ? selectedMedia.fileName : 'Select Media'}
              </span>
              <span className="text-muted-foreground text-xs">
                {selectedMedia
                  ? 'Click to change'
                  : 'Upload or choose from library'}
              </span>
            </div>
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0 shadow-xl" align="start">
        <div className="bg-muted/30 flex items-center justify-between border-b p-3">
          <span className="text-muted-foreground text-xs font-bold uppercase">
            Library
          </span>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-primary h-8 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" /> Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Assets</DialogTitle>
              </DialogHeader>
              <ImageUpload
                uploadFiles={async (files) => {
                  await uploadMutation.mutateAsync(files);
                  setIsUploadOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-80">
          <div className="p-3">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {allMedia.map((media) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => {
                      onChange(media);
                      setOpen(false); // Close on selection
                    }}
                    className={cn(
                      'relative aspect-square rounded-md border-2 overflow-hidden transition-all',
                      value === media.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-primary/50'
                    )}
                  >
                    <img
                      src={media.url}
                      className="h-full w-full object-cover"
                      alt={media.fileName}
                    />
                    {value === media.id && (
                      <div className="bg-primary/20 absolute inset-0 flex items-center justify-center">
                        <Check className="text-primary h-5 w-5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Show more'
                )}
              </Button>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
