'use client';

import { useRef, useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { ImageIcon, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  ACCEPTED_IMAGE_MIME_TYPES,
  ACCEPTED_MEDIA_MIME_TYPES,
  findUploadViolation,
  MAX_UPLOAD_BATCH,
  maxUploadSizeFor,
} from '@/entities/media/model/upload-constraints';
import { compressInBrowser } from '@/shared/lib/media/compress-in-browser';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

export interface ImageUploadProps {
  /**
   * Rejects when the batch is refused. The mutation behind it reports the
   * refusal, so this component keeps the files listed for a retry.
   */
  uploadFiles: (files: File[]) => Promise<void>;
  /** The owner's compression settings, from `useWorkspaceSettings()`. */
  compressionConfig: ImageCompressionConfig;
  /**
   * Also take mp4/webm clips. Off for the pickers (blog covers, logos), which
   * can only draw an image; on for the media library itself.
   */
  acceptVideo?: boolean;
}

export function ImageUpload({
  uploadFiles,
  compressionConfig,
  acceptVideo = false,
}: ImageUploadProps) {
  const t = useTranslations('dashboard.media');
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const isBusy = isCompressing || isUploading;
  const acceptedTypes: readonly string[] = acceptVideo
    ? ACCEPTED_MEDIA_MIME_TYPES
    : ACCEPTED_IMAGE_MIME_TYPES;

  // Compresses BEFORE the size check, not after: a phone photo that arrives
  // here over the 3 MB ceiling and would compress under it must be given the
  // chance to shrink first, or this rejects it for a size it never actually
  // uploads at. `compressInBrowser` itself is a no-op for SVG/GIF/a disabled
  // config, so this loop is safe to run unconditionally.
  const handleFiles = async (incomingFiles: FileList | null) => {
    // A batch in flight takes no new files, so the upload sends what was listed.
    if (!incomingFiles || isBusy) return;

    setIsCompressing(true);
    try {
      const validFiles: File[] = [];
      const incoming = Array.from(incomingFiles);

      // Chunks of MAX_UPLOAD_BATCH: each compression decodes a full bitmap,
      // so an unbounded fan-out over a big folder drop would spike memory.
      for (let i = 0; i < incoming.length; i += MAX_UPLOAD_BATCH) {
        const chunk = incoming.slice(i, i + MAX_UPLOAD_BATCH);

        const compressedChunk = await Promise.all(
          chunk.map((file) =>
            // The shared list, not `startsWith('image/')`: the server accepts
            // a fixed set, and letting a format through here only moves the
            // rejection later.
            acceptedTypes.includes(file.type)
              ? compressInBrowser(file, compressionConfig)
              : null
          )
        );

        chunk.forEach((file, index) => {
          const compressed = compressedChunk[index];

          if (!compressed) {
            toast.error(t('upload.invalidTypeTitle'), {
              description: t(
                acceptVideo
                  ? 'upload.invalidMediaTypeDescription'
                  : 'upload.invalidTypeDescription',
                { fileName: file.name }
              ),
            });
            return;
          }

          // A clip has its own, higher ceiling than an image.
          const max = maxUploadSizeFor(compressed.type);
          if (compressed.size > max.bytes) {
            toast.error(t('upload.fileTooLargeTitle'), {
              description: t('upload.fileTooLargeDescription', {
                fileName: file.name,
                maxSize: max.mb,
              }),
            });
            return;
          }

          validFiles.push(compressed);
        });
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

    // What the server would refuse for the whole request, said here in the
    // reader's language instead of as the server's English sentence.
    const violation = findUploadViolation(files);
    if (violation?.kind === 'batch') {
      toast.error(t('upload.tooManyFilesTitle'), {
        description: t('upload.tooManyFilesDescription', {
          max: violation.max,
        }),
      });
      return;
    }
    if (violation?.kind === 'total') {
      toast.error(t('upload.totalTooLargeTitle'), {
        description: t('upload.totalTooLargeDescription', {
          maxSize: violation.maxSizeMb,
        }),
      });
      return;
    }

    setIsUploading(true);
    try {
      // The success toast comes from the mutation behind `uploadFiles`.
      await uploadFiles(files);
      setFiles([]);
    } catch {
      // The mutation behind `uploadFiles` has already shown the refusal.
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* The zone is a secondary target: the button inside is the keyboard path,
          and its click bubbles here to open the same input. */}
      <div
        className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center aria-disabled:pointer-events-none aria-disabled:opacity-60"
        aria-disabled={isBusy}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        {isCompressing ? (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
        ) : (
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm">
          {isCompressing
            ? t('upload.compressingText')
            : t(
                acceptVideo ? 'upload.dropzoneMediaText' : 'upload.dropzoneText'
              )}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={isBusy}
        >
          {t('upload.chooseFiles')}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept={acceptVideo ? 'image/*,video/mp4,video/webm' : 'image/*'}
        disabled={isBusy}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div className="grid gap-2">
        {files.map((file, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-md border bg-muted/30 p-2"
          >
            <span className="max-w-[200px] truncate text-xs">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('upload.removeFile', { name: file.name })}
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
