'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ImageIcon, Loader2, Plus, X } from 'lucide-react';

import { uploadMedia } from '@/lib/actions/dashboard/media/upload-media';
import { cn } from '@/lib/utils';
import { useMediaInfiniteQuery } from '@/hooks/query/use-media-infinite-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { ImageUpload } from '@/components/image-upload';

interface MediaMultiSelectProps {
  value?: string[];
  onChange: (ids: string[]) => void;
}

export function MediaMultiSelect({
  value = [],
  onChange,
}: MediaMultiSelectProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMediaInfiniteQuery(12);

  const allMedia = data?.pages.flatMap((page) => page?.data) || [];
  const selectedMedia = allMedia.filter((m) => value.includes(m?.id));

  // Multi-upload mutation
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['media'] });
        toast({ title: 'Upload successful' });
        setIsUploadOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: res.errorMsg,
        });
      }
    },
  });

  const toggleSelect = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const removeItem = (id: string) => {
    onChange(value.filter((v) => v !== id));
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
                    className="h-full w-full object-contain"
                    alt={media.fileName}
                  />
                </div>
              ))
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center border shrink-0">
                <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
              </div>
            )}

            <div className="flex flex-col items-start text-left ml-2">
              <span className="text-sm font-medium">
                {selectedMedia.length > 0
                  ? `${selectedMedia.length} selected`
                  : 'Select Media'}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedMedia.length > 3
                  ? `+ ${selectedMedia.length - 3} more`
                  : 'Click to choose'}
              </span>
            </div>
          </div>

          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0 shadow-xl" align="start">
        {/* Header with Upload Action */}
        <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-muted-foreground">
              Library
            </span>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[10px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3" /> Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Assets</DialogTitle>
                </DialogHeader>
                <ImageUpload
                  uploadFiles={async (files) => {
                    await uploadMutation.mutateAsync(files);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

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
        </div>

        {/* Selected preview bar */}
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
                    className="h-full w-full object-contain"
                    alt={media.fileName}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(media.id)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                <p className="text-xs text-muted-foreground">
                  Loading assets...
                </p>
              </div>
            ) : allMedia.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Library is empty.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsUploadOpen(true)}
                >
                  Upload Media
                </Button>
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
                        'relative aspect-square rounded-md border-2 overflow-hidden bg-muted/20 transition-all',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-primary/50'
                      )}
                    >
                      <img
                        src={media.url}
                        className="object-contain w-full h-full p-1.5"
                        alt={media.fileName}
                      />

                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="bg-primary text-white rounded-full p-0.5 shadow-sm">
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
              <div className="mt-4 flex justify-center border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    'Show more'
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
