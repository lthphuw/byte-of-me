'use client';

import { useTranslations } from 'next-intl';

import { useMediaUpload } from '@/entities/media/query';
import { ImageUpload } from '@/features/dashboard/media-library/ui/image-upload';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';
import { RecordDialog } from '@/shared/ui/record-dialog';

export interface MediaPickerUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compressionConfig: ImageCompressionConfig;
}

/** A picker's upload dialog: images only, and it stays open while a batch uploads. */
export function MediaPickerUploadDialog({
  open,
  onOpenChange,
  compressionConfig,
}: MediaPickerUploadDialogProps) {
  const t = useTranslations('dashboard.media');
  const crud = useTranslations('dashboard.shared.crud');
  const upload = useMediaUpload({
    uploadError: t('toast.uploadError'),
    uploadSuccess: crud('created', { entity: t('entity') }),
  });

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('picker.uploadAssetsTitle')}
      footer={null}
      isPending={upload.isPending}
    >
      <ImageUpload
        compressionConfig={compressionConfig}
        uploadFiles={async (files) => {
          await upload.mutateAsync(files);
          onOpenChange(false);
        }}
      />
    </RecordDialog>
  );
}
