'use client';

import { useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { ImageIcon, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
} from '@/entities/media/model/upload-constraints';

export interface ImageUploadProps {
  uploadFiles: (files: File[]) => Promise<void>;
}

export function ImageUpload({ uploadFiles }: ImageUploadProps) {
  const t = useTranslations('dashboard.media');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const handleFiles = (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;

    const validFiles = Array.from(incomingFiles).filter((file) => {
      // The shared list, not `startsWith('image/')`: the server accepts a fixed
      // set, and letting a format through here only moves the rejection later.
      if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as never)) {
        toast.error(t('upload.invalidTypeTitle'), {
          description: t('upload.invalidTypeDescription', {
            fileName: file.name,
          }),
        });
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(t('upload.fileTooLargeTitle'), {
          description: t('upload.fileTooLargeDescription', {
            fileName: file.name,
            maxSize: MAX_IMAGE_SIZE_MB,
          }),
        });
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      await uploadFiles(files);
      toast(t('upload.successTitle'), {
        description: t('upload.successDescription'),
      });
      setFiles([]);
    } catch (error) {
      toast.error(t('upload.uploadFailedTitle'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center hover:bg-primary/5"
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm">{t('upload.dropzoneText')}</p>
        <input
          id="file-upload"
          type="file"
          multiple
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="grid gap-2">
        {files.map((file, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-md border bg-muted/30 p-2"
          >
            <span className="max-w-[200px] truncate text-xs">{file.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFile(idx)}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        onClick={handleUpload}
        disabled={files.length === 0 || isUploading}
      >
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          t('upload.uploadButton', { count: files.length })
        )}
      </Button>
    </div>
  );
}
