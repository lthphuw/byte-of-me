'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  maxUploadSizeFor,
  MediaViolationError,
  pickUploadPath,
} from '@/entities/media/model/upload-constraints';
import { useMediaLibrary } from '@/entities/media/query';
import { useCompressionSettings } from '@/features/dashboard/media-library/lib/use-compression-settings';
import { CompressionSettingsPopover } from '@/features/dashboard/media-library/ui/compression-settings-popover';
import { ImageUpload } from '@/features/dashboard/media-library/ui/image-upload';
import type { Media } from '@/shared/types/models';
import {
  AddButton,
  ConfirmDeleteDialog,
  ManagerListState,
  ManagerPageHeader,
  ManagerPagination,
  RecordDialog,
} from '@/shared/ui';
import { MediaLibrary } from '@/widgets/dashboard/media-manager/ui/media-library';
import { MediaLibrarySkeleton } from '@/widgets/dashboard/media-manager/ui/media-library-skeleton';

export function MediaManager() {
  const t = useTranslations('dashboard.media');
  const tCrud = useTranslations('dashboard.shared.crud');
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);

  const compression = useCompressionSettings();

  const entity = t('entity');
  const { query, upload, uploadClip, remove } = useMediaLibrary(page, {
    uploadError: t('toast.uploadError'),
    uploadSuccess: tCrud('created', { entity }),
    deleteSuccess: tCrud('deleted', { entity }),
    deleteError: tCrud('deleteError', { entity }),
  });
  // A refused read throws (`mediaQueries.library`), so `isError` covers it.
  const mediaList = query.data?.data ?? [];
  const pagination = query.data?.meta;

  // The last row of the last page was deleted: step back to the new last page.
  // Placeholder data is skipped, because it describes the page being left.
  const totalPages = pagination?.totalPages;
  useEffect(() => {
    if (totalPages === undefined || query.isPlaceholderData) return;
    const lastPage = Math.max(1, totalPages);
    if (page > lastPage) setPage(lastPage);
  }, [page, query.isPlaceholderData, totalPages]);

  // Images go through the server action and clips straight to storage, because
  // `uploadMedia` refuses video. A batch that fails partway keeps what it stored.
  const uploadFiles = async (files: File[]) => {
    const images: File[] = [];
    const clips: File[] = [];
    for (const file of files) {
      const route = pickUploadPath(file);
      if ('error' in route) {
        throw new MediaViolationError({
          kind: 'size',
          fileName: file.name,
          maxSizeMb: maxUploadSizeFor(file.type).mb,
        });
      }
      if (route.path === 'direct') clips.push(file);
      else images.push(file);
    }

    setIsUploading(true);
    try {
      if (images.length > 0) await upload.mutateAsync(images);
      for (const clip of clips) {
        await uploadClip.mutateAsync({ file: clip, scope: 'general' });
      }
      setIsUploadOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  const addButton = (
    <AddButton label={t('addButton')} onClick={() => setIsUploadOpen(true)} />
  );

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
            {addButton}
          </div>
        }
      />

      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => void query.refetch()}
          isEmpty={mediaList.length === 0}
          emptyTitle={t('empty.title')}
          emptyDescription={t('empty.description')}
          emptyAction={addButton}
          pagination={
            <ManagerPagination
              pagination={pagination}
              setPage={setPage}
              isPlaceholderData={query.isPlaceholderData}
            />
          }
          skeleton={<MediaLibrarySkeleton />}
        >
          <MediaLibrary
            mediaList={mediaList}
            isPlaceholderData={query.isPlaceholderData}
            onDelete={setMediaToDelete}
            deletingId={remove.isPending ? remove.variables ?? null : null}
          />
        </ManagerListState>
      </div>

      <RecordDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title={t('dialog.uploadTitle')}
        hideFooter
        isPending={isUploading}
      >
        <ImageUpload
          compressionConfig={compression.config}
          acceptVideo
          uploadFiles={uploadFiles}
        />
      </RecordDialog>

      <ConfirmDeleteDialog
        open={mediaToDelete !== null}
        isLoading={remove.isPending}
        onClose={() => setMediaToDelete(null)}
        onConfirm={() => {
          if (!mediaToDelete) return;
          remove.mutate(mediaToDelete.id, {
            onSuccess: () => setMediaToDelete(null),
          });
        }}
        title={tCrud('deleteTitle', { entity })}
        description={tCrud('deleteDescription', {
          name: mediaToDelete?.fileName ?? '',
        })}
      />
    </div>
  );
}
