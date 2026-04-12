'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { useMediaLibrary } from '@/entities/media/api/use-media-library';
import { ImageUpload } from '@/features/dashboard/media-library/ui/image-upload';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import Loading from '@/shared/ui/loading';
import { MediaLibrary } from '@/widgets/media-manager/ui/media-library';
import { MediaLibraryEmpty } from '@/widgets/media-manager/ui/media-library-empty';

export function MediaManager() {
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const { query, upload, remove } = useMediaLibrary(page);
  const mediaList = query?.data?.data?.data || [];
  const pagination = query?.data?.data?.meta;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <section>
          <h2 className="text-2xl font-bold tracking-tight">Media Library</h2>
          <p className="text-muted-foreground text-sm">
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
                upload.mutate(files);
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      {query.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading />
        </div>
      ) : mediaList.length === 0 ? (
        <MediaLibraryEmpty />
      ) : (
        <MediaLibrary
          mediaList={mediaList}
          isPlaceholderData={query.isPlaceholderData}
          setPage={setPage}
          remove={remove.mutate}
          isRemoving={remove.isPending}
          pagination={pagination}
        />
      )}
    </div>
  );
}
