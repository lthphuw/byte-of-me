import { useCallback, useEffect, useRef, useState } from 'react';

interface UseImageUploadProps {
  onUpload?: (url: string) => void;
  /**
   * Real upload implementation (e.g. the ImageExtension's `uploadFn`).
   * When omitted, the local object URL is handed to `onUpload` and the
   * ImageExtension's auto-upload effect converts the blob: src afterwards.
   */
  uploadFn?: (file: File) => Promise<string>;
}

export function useImageUpload({ onUpload, uploadFn }: UseImageUploadProps = {}) {
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
        const errorMessage =
          err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setUploading(false);
      }
    },
    [uploadFn]
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
