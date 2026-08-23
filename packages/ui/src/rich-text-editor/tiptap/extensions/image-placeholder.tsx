'use client';

 
// @ts-nocheck
import { type ChangeEvent, type FormEvent, useState } from 'react';
import {
  type CommandProps,
  mergeAttributes,
  Node,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { Image, Link, Loader2, Upload, X } from 'lucide-react';

import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger, } from '../../../index';
import { isValidUrl, NODE_HANDLES_SELECTED_STYLE_CLASSNAME, } from '../../../lib/tiptap-utils';
import { cn } from '../../../lib/utils';

import { imageUploadFn, resolveImages } from './upload-images';
import { useImageUpload } from './use-image-upload';

export interface ImagePlaceholderOptions {
  HTMLAttributes: Record<string, unknown>;
  onUpload?: (url: string) => void;
  onError?: (error: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imagePlaceholder: {
      /**
       * Inserts an image placeholder
       */
      insertImagePlaceholder: () => ReturnType;
    };
  }
}

export const ImagePlaceholder = Node.create<ImagePlaceholderOptions>({
  name: 'image-placeholder',

  addOptions() {
    return {
      HTMLAttributes: {},
      onUpload: () => {},
      onError: () => {},
    };
  },

  group: 'block',

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImagePlaceholderComponent, {
      className: NODE_HANDLES_SELECTED_STYLE_CLASSNAME,
    });
  },

  addCommands() {
    return {
      insertImagePlaceholder: () => (props: CommandProps) => {
        return props.commands.insertContent({
          type: 'image-placeholder',
        });
      },
    };
  },
});

function ImagePlaceholderComponent(props: NodeViewProps) {
  const { editor, extension, selected } = props;

  /**
   * Whether THIS editor was configured with a real uploader (read off the
   * live `image` extension, same as `TiptapImage`'s own auto-upload effect
   * and `resolveImages` — see `upload-images.ts`).
   *
   * Without one, the device-upload path below cannot work: picking a file
   * inserts the local `blob:` preview URL as the image's `src` (the
   * documented fallback in `useImageUpload`), and this component's own
   * `onUpload` handler immediately calls `handleRemove()`, which revokes that
   * same URL before the node view for it has even mounted. `TiptapImage`'s
   * auto-upload effect is the only thing that would otherwise turn that
   * `blob:` src into something real, and with no `uploadFn` configured it
   * just `console.error`s — leaving a node whose `src` is a revoked object
   * URL: broken in every tab, forever, and nothing the author did wrong. So
   * the tab offering that path is hidden rather than left to fail silently;
   * the URL tab needs no uploader and stays.
   */
  const hasUploader = Boolean(imageUploadFn(editor));

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>(
    hasUploader ? 'upload' : 'url'
  );
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const [insertingMany, setInsertingMany] = useState(false);

  const {
    previewUrl,
    fileInputRef,
    handleFileChange: handleSingleFileChange,
    handleRemove,
    uploading,
    error,
  } = useImageUpload({
    onUpload: (imageUrl) => {
      editor
        .chain()
        .focus()
        .setImage({
          src: imageUrl,
          alt: altText || fileInputRef.current?.files?.[0]?.name,
        })
        .run();
      handleRemove();
      setIsExpanded(false);
    },
  });

  /**
   * One picker for both shapes: one file becomes an image, several become a
   * row of images side by side. There is no separate "insert a row" button
   * because there is no separate decision — the author picks the files they
   * want next to each other, and the count says the rest.
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length < 2) return handleSingleFileChange(e);

    void (async () => {
      setInsertingMany(true);
      try {
        const images = await resolveImages(editor, files);
        if (images.length > 0) {
          editor.chain().focus().setImageGroup(images).run();
          setIsExpanded(false);
        }
      } finally {
        setInsertingMany(false);
      }
    })();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    // Every dropped file, not just the first: dropping two images here is the
    // same gesture as picking two in the dialog, and produces the same row.
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        files.forEach((file) => dataTransfer.items.add(file));
        input.files = dataTransfer.files;
        handleFileChange({
          target: input,
        } as unknown as ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleInsertEmbed = (e: FormEvent) => {
    e.preventDefault();
    const valid = isValidUrl(url);
    if (!valid) {
      setUrlError(true);
      return;
    }
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: altText }).run();
      setIsExpanded(false);
      setUrl('');
      setAltText('');
    }
  };

  // Split out so the same markup can render either as one of two Tabs panes
  // (an uploader is configured) or standalone (it is not) — see `hasUploader`
  // above.
  const uploadTabContent = (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'my-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        isDragActive && 'border-primary bg-primary/10',
        error && 'border-destructive bg-destructive/10'
      )}
    >
      {previewUrl ? (
        <div className="space-y-4">
          <img
            src={previewUrl}
            alt="Preview"
            className="mx-auto max-h-[200px] rounded-lg object-cover"
          />
          <div className="space-y-2">
            <Input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Alt text (optional)"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={uploading}
              >
                Remove
              </Button>
              <Button disabled={uploading}>
                {uploading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="flex cursor-pointer flex-col items-center gap-4"
          >
            {insertingMany ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                SVG, PNG, JPG or GIF — pick several for a row
              </p>
            </div>
          </label>
        </>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );

  const urlTabContent = (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (urlError) setUrlError(false);
          }}
          placeholder="Enter image URL..."
        />
        {urlError && (
          <p className="text-xs text-destructive">Please enter a valid URL</p>
        )}
      </div>
      <div className="space-y-2">
        <Input
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Alt text (optional)"
        />
      </div>
      <Button onClick={handleInsertEmbed} className="w-full" disabled={!url}>
        Add Image
      </Button>
    </div>
  );

  return (
    <NodeViewWrapper className="w-full">
      <div className="relative">
        {!isExpanded ? (
          <div
            onClick={() => setIsExpanded(true)}
            className={cn(
              'group relative flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 transition-all hover:bg-accent',
              selected && 'border-primary bg-primary/5',
              isDragActive && 'border-primary bg-primary/5',
              error && 'border-destructive bg-destructive/5'
            )}
          >
            <div className="rounded-full bg-background p-4 shadow-sm transition-colors group-hover:bg-accent">
              <Image className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                SVG, PNG, JPG or GIF
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Image</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {hasUploader ? (
              <Tabs
                value={activeTab}
                onValueChange={(v: string) =>
                  setActiveTab(v as 'upload' | 'url')
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <Link className="mr-2 h-4 w-4" />
                    URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload">{uploadTabContent}</TabsContent>
                <TabsContent value="url">{urlTabContent}</TabsContent>
              </Tabs>
            ) : (
              // No uploader configured: the Upload tab is not offered at
              // all — see `hasUploader` above for why — so there is only one
              // way in, and a lone tab is not a tab. The URL form renders
              // directly.
              urlTabContent
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
