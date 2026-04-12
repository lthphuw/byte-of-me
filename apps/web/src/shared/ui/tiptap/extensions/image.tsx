'use client';

import Image from '@tiptap/extension-image';
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImageIcon,
  Loader2,
  MoreVertical,
  Trash,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { uploadMedia } from '@/entities/media/api/upload-media';
import { useImageUpload } from '@/shared/hooks/use-image-upload';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { Separator } from '@/shared/ui/separator';

export const ImageExtension = Image.extend({
  addOptions() {
    const parent = this.parent?.();

    if (!parent) {
      throw new Error('Image parent options missing');
    }

    return {
      ...parent,
      inline: parent.inline ?? false,
      allowBase64: parent.allowBase64 ?? true,
      HTMLAttributes: parent.HTMLAttributes ?? {},
      uploadFn: async (file: File) => {
        const res = await uploadMedia([file]);
        if (!res?.success || !res.data?.[0].url) {
          throw new Error('Upload failed');
        }

        return res.data[0].url;
      },
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: '100%' },
      height: { default: null },
      align: { default: 'center' },
      caption: { default: '' },
      aspectRatio: { default: null },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TiptapImage);
  },
});

function TiptapImage(props: NodeViewProps) {
  const { node, editor, selected, deleteNode, updateAttributes } = props;

  const imageRef = useRef<HTMLImageElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const [uploadingBlob, setUploadingBlob] = useState(false);
  const uploadedRef = useRef(false); // prevent loop

  const [altText, setAltText] = useState(node.attrs.alt || '');
  const [imageUrl, setImageUrl] = useState('');
  const [openedMore, setOpenedMore] = useState(false);

  /**
   * 🔥 AUTO UPLOAD blob → S3
   */
  useEffect(() => {
    const src = node.attrs.src;

    if (!src || !src.startsWith('blob:') || uploadedRef.current) return;

    uploadedRef.current = true;

    const upload = async () => {
      try {
        setUploadingBlob(true);

        const imageExtension = editor.extensionManager.extensions.find(
          (ext) => ext.name === 'image'
        );

        const uploadFn = imageExtension?.options?.uploadFn;

        if (!uploadFn) {
          console.error('Missing uploadFn');
          return;
        }

        const res = await fetch(src);
        const blob = await res.blob();
        const file = new File([blob], 'image', { type: blob.type });

        const uploadedUrl = await uploadFn(file);

        updateAttributes({
          src: uploadedUrl, // ✅ replace with S3
        });
      } catch (err) {
        console.error('Upload failed', err);
      } finally {
        setUploadingBlob(false);
      }
    };

    upload();
  }, [node.attrs.src, editor, updateAttributes]);

  /**
   * Manual upload (replace image)
   */
  const { fileInputRef, handleFileChange, handleRemove, uploading, error } =
    useImageUpload({
      onUpload: (url) => {
        updateAttributes({
          src: url,
          alt: altText,
        });
        handleRemove();
        setOpenedMore(false);
      },
    });

  const handleImageUrlSubmit = () => {
    if (!imageUrl) return;

    updateAttributes({
      src: imageUrl,
      alt: altText,
    });

    setImageUrl('');
    setAltText('');
    setOpenedMore(false);
  };

  return (
    <NodeViewWrapper
      ref={nodeRef}
      className={cn(
        'relative flex flex-col rounded-md border-2 border-transparent',
        selected && 'border-blue-300',
        node.attrs.align === 'left' && 'self-start',
        node.attrs.align === 'center' && 'mx-auto',
        node.attrs.align === 'right' && 'self-end'
      )}
      style={{ width: node.attrs.width }}
    >
      <div className="group relative">
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          className="rounded-lg"
        />

        {/* 🔥 Uploading overlay */}
        {uploadingBlob && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        {/* Toolbar */}
        {editor.isEditable && (
          <div className="bg-background/80 absolute right-2 top-2 flex gap-1 rounded p-1 opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => updateAttributes({ align: 'left' })}
            >
              <AlignLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => updateAttributes({ align: 'center' })}
            >
              <AlignCenter className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => updateAttributes({ align: 'right' })}
            >
              <AlignRight className="size-4" />
            </Button>

            <Separator orientation="vertical" className="h-[20px]" />

            <DropdownMenu open={openedMore} onOpenChange={setOpenedMore}>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ImageIcon className="mr-2 size-4" />
                    Replace Image
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent className="w-56 space-y-3 p-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      hidden
                    />

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading && <Loader2 className="mr-2 animate-spin" />}
                      Upload
                    </Button>

                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Image URL"
                    />

                    <Button onClick={handleImageUrlSubmit} disabled={!imageUrl}>
                      Use URL
                    </Button>

                    <Input
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Alt text"
                    />

                    {error && (
                      <p className="text-destructive text-xs">{error}</p>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={deleteNode}>
                  <Trash className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
