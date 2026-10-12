import { useCallback, useEffect, useRef, useState } from 'react';

interface UseImageUploadProps {
  onUpload?: (url: string) => void;
  /**
   * Real upload implementation (e.g. the ImageExtension's `uploadFn`).
   * When omitted, the local object URL is handed to `onUpload` and the
   * ImageExtension's auto-upload effect converts the blob: src afterwards.
   */
  uploadFn?: (file: File) => Promise<string>;
  /**
   * What the author sees when an upload is refused without a message of its
   * own. Already translated by the caller; this hook holds no copy of its own.
   */
  uploadFailedText: string;
}

export function useImageUpload({
  onUpload,
  uploadFn,
  uploadFailedText,
}: UseImageUploadProps) {
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, localUrl: string): Promise<string> => {
      if (!uploadFn) return localUrl;

      try {
        setUploading(true);
        const uploadedUrl = await uploadFn(file);
        setError(null);
        return uploadedUrl;
      } catch (err) {
        setError(
          err instanceof Error && err.message ? err.message : uploadFailedText
        );
        // Rethrown as it arrived: the console keeps the uploader's own error.
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [uploadFailedText, uploadFn]
  );

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setFileName(file.name);
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        previewRef.current = localUrl;

        try {
          const uploadedUrl = await upload(file, localUrl);
          onUpload?.(uploadedUrl);
        } catch (err) {
          URL.revokeObjectURL(localUrl);
          setPreviewUrl(null);
          setFileName(null);
          return console.error(err);
        }
      }
    },
    [onUpload, upload]
  );

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileName(null);
    previewRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
    uploading,
    error,
  };
}
