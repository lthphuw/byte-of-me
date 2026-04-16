'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ImageIcon, Loader2, Plus, X } from 'lucide-react';

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
          className="min-h-[56px] w-full justify-between border-2 border-dashed px-3 transition-all hover:border-primary hover:bg-primary/5"
        >
          <div className="flex flex-wrap items-center gap-2 py-1">
            {selectedMedia.length > 0 ? (
              selectedMedia.slice(0, 3).map((media) => (
                <div
                  key={media.id}
                  className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-background"
                >
                  <img
                    src={media.url}
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
                {value.length > 0 ? `${value.length} selected` : 'Select Media'}
              </span>
              <span className="text-xs text-muted-foreground">
                {value.length > 3
                  ? `+ ${value.length - 3} more`
                  : 'Click to manage'}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0 shadow-xl" align="start">
        <div className="flex items-center justify-between border-b bg-muted/30 p-3">
          <span className="text-xs font-bold uppercase text-muted-foreground">
            Library
          </span>
          <div className="flex gap-2">
            {value.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs hover:text-destructive"
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
          <ScrollArea className="max-h-24 border-b bg-background">
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
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="rounded-full bg-primary p-0.5 text-white">
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
