'use client';

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
import { Check, ChevronDown, ImageIcon, Loader2, Plus, X } from 'lucide-react';

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
          className="w-full justify-between min-h-[56px] px-3 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
        >
          <div className="flex items-center gap-2 flex-wrap py-1">
            {selectedMedia.length > 0 ? (
              selectedMedia.slice(0, 3).map((media) => (
                <div
                  key={media.id}
                  className="h-10 w-10 rounded overflow-hidden border bg-background shrink-0"
                >
                  <img
                    src={media.url}
                    className="h-full w-full object-cover"
                    alt={media.fileName}
                  />
                </div>
              ))
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center border shrink-0">
                <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}

            <div className="flex flex-col items-start text-left ml-2">
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
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0 shadow-xl" align="start">
        <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
          <span className="text-xs font-bold uppercase text-muted-foreground">
            Library
          </span>
          <div className="flex gap-2">
            {value.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 px-2 hover:text-destructive"
                onClick={() => onChange([])}
              >
                Clear All
              </Button>
            )}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 px-2 text-[10px] gap-1">
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
            <div className="p-3 flex gap-2 flex-wrap">
              {selectedMedia.map((media) => (
                <div
                  key={media.id}
                  className="relative h-12 w-12 rounded overflow-hidden border group"
                >
                  <img
                    src={media.url}
                    className="h-full w-full object-cover"
                    alt={media.fileName}
                  />
                  <button
                    type="button"
                    onClick={() => toggleSelect(media.id)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
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
                        className="object-cover w-full h-full"
                        alt={media.fileName}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-white rounded-full p-0.5">
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
                className="w-full mt-4"
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
