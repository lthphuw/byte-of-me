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
import { useWorkspaceSettings } from '@/entities/workspace-settings';
import { compressInBrowser } from '@/shared/lib/media/compress-in-browser';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

export interface ImageUploadProps {
  uploadFiles: (files: File[]) => Promise<void>;
  /**
   * From the media dashboard's compression settings popover — see
   * `MediaManager`. Optional because `MediaSelect`/`MediaMultiSelect` also
   * render this component from inside other dashboard forms (blog, project,
   * education, profile), far from that popover's state; when omitted this
   * falls back to `useWorkspaceSettings()`, seeded server-side by
   * `dashboard/layout.tsx` — the owner's REAL configured settings, not a
   * hardcoded default. Compression toggled off there now actually stays off
   * for every upload path, not just the media library's own dialog.
   */
  compressionConfig?: ImageCompressionConfig;
}

export function ImageUpload({
  uploadFiles,
  compressionConfig,
}: ImageUploadProps) {
  const t = useTranslations('dashboard.media');
  const { settings } = useWorkspaceSettings();
  const effectiveCompressionConfig =
    compressionConfig ?? settings.imageCompression;
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Compresses BEFORE the size check, not after: a phone photo that arrives
  // here over the 3 MB ceiling and would compress under it must be given the
  // chance to shrink first, or this rejects it for a size it never actually
  // uploads at. `compressInBrowser` itself is a no-op for SVG/GIF/a disabled
  // config, so this loop is safe to run unconditionally.
  const handleFiles = async (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;

    setIsCompressing(true);
    try {
      const validFiles: File[] = [];

      for (const file of Array.from(incomingFiles)) {
        // The shared list, not `startsWith('image/')`: the server accepts a
        // fixed set, and letting a format through here only moves the
        // rejection later.
        if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as never)) {
          toast.error(t('upload.invalidTypeTitle'), {
            description: t('upload.invalidTypeDescription', {
              fileName: file.name,
            }),
          });
          continue;
        }

        const compressed = await compressInBrowser(
          file,
          effectiveCompressionConfig
        );

        if (compressed.size > MAX_IMAGE_SIZE_BYTES) {
          toast.error(t('upload.fileTooLargeTitle'), {
            description: t('upload.fileTooLargeDescription', {
              fileName: file.name,
              maxSize: MAX_IMAGE_SIZE_MB,
            }),
          });
          continue;
        }

        validFiles.push(compressed);
      }

      setFiles((prev) => [...prev, ...validFiles]);
    } finally {
      setIsCompressing(false);
    }
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
        className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center hover:bg-primary/5 aria-disabled:pointer-events-none aria-disabled:opacity-60"
        aria-disabled={isCompressing}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        {isCompressing ? (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
        ) : (
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm">
          {isCompressing ? t('upload.compressingText') : t('upload.dropzoneText')}
        </p>
        <input
          id="file-upload"
          type="file"
          multiple
          className="hidden"
          accept="image/*"
          disabled={isCompressing}
          onChange={(e) => void handleFiles(e.target.files)}
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
        disabled={files.length === 0 || isUploading || isCompressing}
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
