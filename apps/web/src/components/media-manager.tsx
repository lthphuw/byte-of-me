'use client';

import { useState } from 'react';
import { Media } from '@/models/media';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { PaginatedData } from '@/types/api/paginated.type';
import { deleteMedia } from '@/lib/actions/dashboard/media/delete-media';
import { getPaginatedMedia } from '@/lib/actions/dashboard/media/get-paginated-media';
import { uploadMedia } from '@/lib/actions/dashboard/media/upload-media';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { toast } from '@/components/ui/use-toast';
import { MediaCard } from '@/components/media-card';
import { ImageUpload } from '@/components/image-upload';
import Loading from '@/components/loading';
import { Pagination } from '@/components/pagination';

interface MediaManagerProps {}

export function MediaManager({ }: MediaManagerProps) {
  const {data: session } = useSession();
  const userId = session?.user?.id!;


  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isPlaceholderData } = useQuery<
    ApiActionResponse<PaginatedData<Media>>
  >({
    queryKey: ['media', userId, page],
    queryFn: () => getPaginatedMedia(page, 12),
    placeholderData: (previousData) => previousData,
  });

  const mediaList = data?.data?.data || [];
  const pagination = data?.data?.meta;

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['media'] });
        toast({ title: 'Upload successful' });
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: res.errorMsg,
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['media'] });
        toast({ title: 'Media deleted' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: res.errorMsg,
        });
      }
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <section>
          <h2 className="text-2xl font-bold tracking-tight">Media Library</h2>
          <p className="text-sm text-muted-foreground">
            Manage your digital assets and uploads.
          </p>
        </section>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Media
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Upload Media</DialogTitle>
            </DialogHeader>
            <ImageUpload
              uploadFiles={async (files) => {
                await uploadMutation.mutateAsync(files);
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading/>
        </div>
      ) : mediaList.length === 0 ? (
        <Empty>
          <EmptyHeader>
            No media found
          </EmptyHeader>
          <EmptyDescription>
            Your library is empty. Upload your first image to get started.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="space-y-4">
          <div
            className={cn(
              'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 transition-opacity duration-200',
              isPlaceholderData && 'opacity-50'
            )}
          >
            {mediaList.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                onDeleteMedia={async (id) => {
                  await deleteMutation.mutateAsync(id);
                }}
              />
            ))}
          </div>

          <Pagination
            pagination={pagination}
            setPage={setPage}
            isPlaceholderData={isPlaceholderData}
          />
        </div>
      )}
    </div>
  );
}
