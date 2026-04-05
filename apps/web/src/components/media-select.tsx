'use client';

import { useState } from 'react';
import { Media } from '@/models/media';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ImageIcon, Loader2, Plus } from 'lucide-react';

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

interface MediaSelectProps {
  value?: string | null;
  onChange: (media: Media) => void;
}

export function MediaSelect({ value, onChange }: MediaSelectProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMediaInfiniteQuery(12);

  const allMedia = data?.pages.flatMap((page) => page?.data) || [];
  const selectedMedia = allMedia.find((m) => m?.id === value);

  // Mutation for multi-upload
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['media'] });
        toast({ title: 'Upload successful' });
        setIsUploadOpen(false); // Close upload dialog on success
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: res.errorMsg,
        });
      }
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-14 px-3 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
        >
          <div className="flex items-center gap-3">
            {selectedMedia ? (
              <div className="h-10 w-10 rounded overflow-hidden border bg-background">
                <img
                  src={selectedMedia.url}
                  className="h-full w-full object-contain"
                  alt="Selected"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center border">
                <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-medium">
                {selectedMedia ? selectedMedia.fileName : 'Select Media'}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedMedia && 'Click to change'}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0 shadow-xl" align="start">
        <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
          <span className="text-xs font-bold uppercase text-muted-foreground">
            Library
          </span>

          {/* Nested Upload Dialog */}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
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

        <ScrollArea className="h-80">
          <div className="p-3">
            {isLoading ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  Loading your assets...
                </p>
              </div>
            ) : allMedia.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  No media found.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsUploadOpen(true)}
                >
                  Upload your first image
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {allMedia.map(
                  (media) =>
                    media && (
                      <button
                        key={media.id}
                        type="button"
                        title={media.fileName}
                        onClick={() => onChange(media)}
                        className={cn(
                          'group relative aspect-square rounded-md border-2 overflow-hidden bg-muted/20 transition-all',
                          value === media.id
                            ? 'border-primary ring-2 ring-primary/20 shadow-inner'
                            : 'border-transparent hover:border-primary/50'
                        )}
                      >
                        <img
                          src={media.url}
                          className="object-contain w-full h-full p-1.5"
                          alt={media.fileName}
                        />
                        {value === media.id && (
                          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                            <div className="bg-primary text-white rounded-full p-0.5 shadow-lg">
                              <Check className="h-3 w-3" />
                            </div>
                          </div>
                        )}
                      </button>
                    )
                )}
              </div>
            )}

            {hasNextPage && (
              <div className="mt-4 flex justify-center border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs hover:bg-primary/5"
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
