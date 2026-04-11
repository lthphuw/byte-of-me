'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/use-toast';
import { ImageIcon, Loader2, X } from 'lucide-react';

export interface ImageUploadProps {
  uploadFiles: (files: File[]) => Promise<any>;
}

export function ImageUpload({ uploadFiles }: ImageUploadProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const maxSizeUploadInMbs = 3;
  const handleFiles = (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;

    const validFiles = Array.from(incomingFiles).filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid type',
          description: `${file.name} is not an image.`,
          variant: 'destructive',
        });
        return false;
      }
      if (file.size > maxSizeUploadInMbs * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${maxSizeUploadInMbs}MB.`,
          variant: 'destructive',
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
      toast({ title: 'Success', description: 'All images uploaded.' });
      setFiles([]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-primary/5 cursor-pointer"
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm">Click or drag images here</p>
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
            className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
          >
            <span className="text-xs truncate max-w-[200px]">{file.name}</span>
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
          `Upload ${files.length} Files`
        )}
      </Button>
    </div>
  );
}
