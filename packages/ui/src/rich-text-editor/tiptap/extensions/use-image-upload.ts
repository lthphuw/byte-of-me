import { useCallback, useRef, useState } from 'react';

interface UseImageUploadProps {
  /** Receives the image's address, and the file it came from. */
  onUpload?: (url: string, file: File) => void;
  /**
   * The real upload (the ImageExtension's `uploadFn`). Without one the `blob:` URL goes to
   * `onUpload` and the image node's auto-upload effect uploads it (or removes the node), so
   * the receiver must not revoke it.
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Empties the file input, so picking the same file again still reports. */
  const reset = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!uploadFn) {
        onUpload?.(URL.createObjectURL(file), file);
        return;
      }

      setUploading(true);
      try {
        const url = await uploadFn(file);
        setError(null);
        onUpload?.(url, file);
      } catch (err) {
        setError(
          err instanceof Error && err.message ? err.message : uploadFailedText
        );
      } finally {
        setUploading(false);
      }
    },
    [onUpload, uploadFailedText, uploadFn]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void uploadFile(file);
    },
    [uploadFile]
  );

  return {
    fileInputRef,
    uploadFile,
    handleFileChange,
    reset,
    uploading,
    error,
  };
}
