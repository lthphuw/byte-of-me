'use client';

import { Check, ChevronDown, ImageIcon, Loader2, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useMediaInfiniteQuery, useMediaUpload } from '@/entities/media';
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

interface MediaMultiSelectProps {
  value?: string[];
  onChange: (ids: string[]) => void;
}

export function MediaMultiSelect({
  value = [],
  onChange,
}: MediaMultiSelectProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMediaInfiniteQuery(12);
  const uploadMutation = useMediaUpload();

  const allMedia = useMemo(
    () => data?.pages.flatMap((page) => page?.data ?? []) || [],
    [data]
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
          className="hover:border-primary hover:bg-primary/5 min-h-[56px] w-full justify-between border-2 border-dashed px-3 transition-all"
        >
          <div className="flex flex-wrap items-center gap-2 py-1">
            {selectedMedia.length > 0 ? (
              selectedMedia.slice(0, 3).map((media) => (
                <div
                  key={media.id}
                  className="bg-background h-10 w-10 shrink-0 overflow-hidden rounded border"
                >
                  <img
                    src={media.url}
                    className="h-full w-full object-cover"
                    alt={media.fileName}
                  />
                </div>
              ))
            ) : (
              <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded border">
                <ImageIcon className="text-muted-foreground/40 h-5 w-5" />
              </div>
            )}

            <div className="ml-2 flex flex-col items-start text-left">
              <span className="text-sm font-medium">
                {value.length > 0 ? `${value.length} selected` : 'Select Media'}
              </span>
              <span className="text-muted-foreground text-xs">
                {value.length > 3
                  ? `+ ${value.length - 3} more`
                  : 'Click to manage'}
              </span>
            </div>
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0 shadow-xl" align="start">
        <div className="bg-muted/30 flex items-center justify-between border-b p-3">
          <span className="text-muted-foreground text-xs font-bold uppercase">
            Library
          </span>
          <div className="flex gap-2">
            {value.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="hover:text-destructive h-7 px-2 text-xs"
                onClick={() => onChange([])}
              >
                Clear All
              </Button>
            )}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 gap-1 px-2 text-[10px]">
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
        </div>

        {selectedMedia.length > 0 && (
          <ScrollArea className="bg-background max-h-24 border-b">
            <div className="flex flex-wrap gap-2 p-3">
              {selectedMedia.map((media) => (
                <div
                  key={media.id}
                  className="group relative h-12 w-12 overflow-hidden rounded border"
                >
                  <img
                    src={media.url}
                    className="h-full w-full object-cover"
                    alt={media.fileName}
                  />
                  <button
                    type="button"
                    onClick={() => toggleSelect(media.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <ScrollArea className="h-80">
          <div className="p-3">
            {isLoading ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {allMedia.map((media) => {
                  const isSelected = value.includes(media.id);
                  return (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => toggleSelect(media.id)}
                      className={cn(
                        'relative aspect-square rounded-md border-2 overflow-hidden transition-all',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-primary/50'
                      )}
                    >
                      <img
                        src={media.url}
                        className="h-full w-full object-cover"
                        alt={media.fileName}
                      />
                      {isSelected && (
                        <div className="bg-primary/20 absolute inset-0 flex items-center justify-center">
                          <div className="bg-primary rounded-full p-0.5 text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
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
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Load More'
                )}
              </Button>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
