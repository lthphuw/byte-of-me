'use client';

import { useEffect, useRef, useState } from 'react';
import type { ImageOptions } from '@tiptap/extension-image';
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
import { toast } from 'sonner';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Separator,
} from '../../../index';
import { cn } from '../../../lib/utils';

import { ImageBase, type ImageUploadFn } from './image-base';
import { ImageCaption } from './image-caption';
import { imageUploadFn } from './upload-images';
import { useImageUpload } from './use-image-upload';

export type { ImageUploadFn };

type ExtendedImageOptions = ImageOptions & {
  uploadFn?: ImageUploadFn;
};

/**
 * Editable image node: the schema and HTML from `image-base.ts` — which the
 * server render registers directly — plus the node view and the upload option,
 * which only the editor needs.
 */
export const ImageExtension = ImageBase.extend<ExtendedImageOptions>({
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
      uploadFn: undefined,
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TiptapImage);
  },
});

function TiptapImage(props: NodeViewProps) {
  const { node, editor, selected, deleteNode, updateAttributes } = props;

  const imageRef = useRef<HTMLImageElement | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  const [uploadingBlob, setUploadingBlob] = useState(false);
  // Track the last uploaded blob src (not a boolean) so replacing the image
  // with a new blob: URL triggers a fresh upload instead of being skipped.
  const lastUploadedSrcRef = useRef<string | null>(null);

  const [altText, setAltText] = useState(node.attrs.alt || '');
  const [imageUrl, setImageUrl] = useState('');
  const [openedMore, setOpenedMore] = useState(false);

  const uploadFn = imageUploadFn(editor);

  /**
   * 🔥 AUTO UPLOAD blob → S3
   */
  useEffect(() => {
    const src = node.attrs.src;

    if (!src || !src.startsWith('blob:') || lastUploadedSrcRef.current === src)
      return;

    lastUploadedSrcRef.current = src;

    const upload = async () => {
      try {
        setUploadingBlob(true);

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
        // A failed upload must not leave the node holding its `blob:` src.
        // That URL resolves only in the tab that minted it, so the author goes
        // on seeing their image, saves the document, and every reader gets a
        // broken one — the failure surfaces later, somewhere else, as corrupt
        // content. This used to be a `console.error` and nothing else.
        //
        // Removing the node is the honest outcome: the image genuinely is not
        // there. The message carries the server's reason, so "larger than 3 MB"
        // reaches the author instead of a silent gap.
        toast.error(
          err instanceof Error && err.message ? err.message : 'Upload failed'
        );
        deleteNode();
      } finally {
        setUploadingBlob(false);
      }
    };

    upload();
  }, [node.attrs.src, uploadFn, updateAttributes, deleteNode]);

  /**
   * Manual upload (replace image)
   */
  const { fileInputRef, handleFileChange, handleRemove, uploading, error } =
    useImageUpload({
      uploadFn,
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
    // A real `<figure>`, so the caption below can be a real `<figcaption>` —
    // in the editor as well as on the published page.
    <NodeViewWrapper
      as="figure"
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
          <div className="absolute right-2 top-2 flex gap-1 rounded bg-background/80 p-1 opacity-0 group-hover:opacity-100">
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
                      <p className="text-xs text-destructive">{error}</p>
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

      {/* The raw attribute, not the trimmed reading: a controlled input fed
          `caption.trim()` swallows the space the author just typed. */}
      <ImageCaption
        caption={
          typeof node.attrs.caption === 'string' ? node.attrs.caption : ''
        }
        editable={editor.isEditable}
        placeholder="Add a caption"
        onChange={(caption) => updateAttributes({ caption })}
      />
    </NodeViewWrapper>
  );
}
