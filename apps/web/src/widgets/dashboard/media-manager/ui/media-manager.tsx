'use client';

import { useState } from 'react';
import {
  Button,
  ConfirmDeleteDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Loading,
} from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useMediaLibrary } from '@/entities/media/query/use-media-library';
import { ImageUpload } from '@/features/dashboard/media-library/ui/image-upload';
import { ManagerPageHeader } from '@/shared/ui';
import { MediaLibrary } from '@/widgets/dashboard/media-manager/ui/media-library';
import { MediaLibraryEmpty } from '@/widgets/dashboard/media-manager/ui/media-library-empty';

export function MediaManager() {
  const t = useTranslations('dashboard.media');
  const tShared = useTranslations('dashboard.shared');
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);

  const { query, upload, remove } = useMediaLibrary(page, {
    uploadSuccess: t('toast.uploadSuccess'),
    uploadError: t('toast.uploadError'),
    deleteSuccess: t('toast.deleteSuccess'),
    deleteError: t('toast.deleteError'),
  });
  const mediaList = query?.data?.data?.data || [];
  const pagination = query?.data?.data?.meta;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> {t('addButton')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{t('dialog.uploadTitle')}</DialogTitle>
              </DialogHeader>
              <ImageUpload
                uploadFiles={async (files) => {
                  await upload.mutateAsync(files);
                  setIsOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

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
          remove={(id) => setMediaToDelete(id)}
          isRemoving={remove.isPending}
          pagination={pagination}
        />
      )}

      <ConfirmDeleteDialog
        isOpen={!!mediaToDelete}
        isLoading={remove.isPending}
        onClose={() => setMediaToDelete(null)}
        onConfirm={() => {
          if (mediaToDelete) {
            remove.mutate(mediaToDelete, {
              onSuccess: () => setMediaToDelete(null),
            });
          }
        }}
        title={t('dialog.deleteTitle')}
        description={t('dialog.deleteDescription')}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
