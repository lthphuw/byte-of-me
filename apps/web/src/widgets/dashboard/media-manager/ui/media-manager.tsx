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
} from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useMediaLibrary } from '@/entities/media/query';
import { useCompressionSettings } from '@/features/dashboard/media-library/lib/use-compression-settings';
import { CompressionSettingsPopover } from '@/features/dashboard/media-library/ui/compression-settings-popover';
import { ImageUpload } from '@/features/dashboard/media-library/ui/image-upload';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';
import { MediaLibrary } from '@/widgets/dashboard/media-manager/ui/media-library';
import { MediaLibrarySkeleton } from '@/widgets/dashboard/media-manager/ui/media-library-skeleton';

export function MediaManager() {
  const t = useTranslations('dashboard.media');
  const tShared = useTranslations('dashboard.shared');
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);

  const compression = useCompressionSettings();

  const { query, upload, remove } = useMediaLibrary(page, {
    uploadError: t('toast.uploadError'),
    deleteSuccess: t('toast.deleteSuccess'),
    deleteError: t('toast.deleteError'),
  });
  // A refused read throws (`mediaQueries.library`), so `isError` covers it.
  const mediaList = query.data?.data ?? [];
  const pagination = query.data?.meta;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <div className="flex items-center gap-2">
            <CompressionSettingsPopover
              config={compression.config}
              update={compression.update}
              isSaving={compression.isSaving}
              saveError={compression.saveError}
            />
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
                  compressionConfig={compression.config}
                  acceptVideo
                  uploadFiles={async (files) => {
                    await upload.mutateAsync(files);
                    setIsOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => query.refetch()}
          isEmpty={mediaList.length === 0}
          emptyTitle={t('empty.title')}
          emptyDescription={t('empty.description')}
          skeleton={<MediaLibrarySkeleton />}
        >
          <MediaLibrary
            mediaList={mediaList}
            isPlaceholderData={query.isPlaceholderData}
            setPage={setPage}
            remove={(id) => setMediaToDelete(id)}
            deletingId={remove.isPending ? remove.variables ?? null : null}
            pagination={pagination}
          />
        </ManagerListState>
      </div>

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
