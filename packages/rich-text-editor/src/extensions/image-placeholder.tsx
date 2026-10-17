'use client';

import {
  type ChangeEvent,
  type FormEvent,
  useId,
  useRef,
  useState,
} from 'react';
import {
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@byte-of-me/ui-primitives';
import { cn } from '@byte-of-me/ui-utils';
import {
  type CommandProps,
  mergeAttributes,
  Node,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import {
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Upload,
  X,
} from 'lucide-react';

import { type EditorLabels, EMPTY_EDITOR_LABELS } from '../editor-labels';

import {
  isValidUrl,
  NODE_HANDLES_SELECTED_STYLE_CLASSNAME,
} from './tiptap-utils';
import {
  imageFilesFrom,
  imageUploadFailedText,
  imageUploadFn,
  resolveImages,
} from './upload-images';
import { useImageUpload } from './use-image-upload';

interface ImagePlaceholderOptions {
  HTMLAttributes: Record<string, unknown>;
  /**
   * The editor's labels, handed to the node view. `createExtensions` sets it.
   */
  labels: EditorLabels;
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
      labels: EMPTY_EDITOR_LABELS,
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
    // A node view receives its node and the editor, not the extension's
    // options, so the labels are read here and handed over.
    const { labels } = this.options;

    return ReactNodeViewRenderer(
      (props: NodeViewProps) => (
        <ImagePlaceholderComponent {...props} labels={labels} />
      ),
      {
        className: NODE_HANDLES_SELECTED_STYLE_CLASSNAME,
      }
    );
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

function ImagePlaceholderComponent(
  props: NodeViewProps & { labels: EditorLabels }
) {
  const { editor, selected, labels } = props;

  // Whether this editor has a real uploader (read off the live `image` extension).
  // Without one a picked file stays a `blob:` URL only this tab resolves: no upload tab.
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

  const uploadFailedText = imageUploadFailedText(editor);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // No uploader of its own here: the file's `blob:` URL goes into the image
  // node, whose auto-upload effect uploads it, or removes the node if it cannot.
  const { uploadFile } = useImageUpload({
    uploadFailedText,
    onUpload: (src, file) => {
      editor
        .chain()
        .focus()
        .setImage({ src, alt: altText || file.name })
        .run();
      setIsExpanded(false);
    },
  });

  /** One picker for both shapes: one file becomes an image, several a row side by side. */
  const insertFiles = (files: File[]) => {
    if (files.length === 0) return;
    if (files.length === 1) {
      void uploadFile(files[0]);
      return;
    }

    void (async () => {
      setInsertingMany(true);
      try {
        const images = await resolveImages(editor, files, uploadFailedText);
        if (images.length > 0) {
          editor.chain().focus().setImageGroup(images).run();
          setIsExpanded(false);
        }
      } finally {
        setInsertingMany(false);
      }
    })();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    insertFiles(Array.from(e.target.files ?? []));
    // So picking the same file again still reports a change.
    e.target.value = '';
  };

  const swallow = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Every dropped image, not just the first: dropping two here is the same
  // gesture as picking two in the dialog, and produces the same row.
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    swallow(e);
    setIsDragActive(false);
    insertFiles(imageFilesFrom(e.dataTransfer.files));
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
      onDragEnter={(e) => {
        swallow(e);
        setIsDragActive(true);
      }}
      onDragLeave={(e) => {
        swallow(e);
        setIsDragActive(false);
      }}
      onDragOver={swallow}
      onDrop={handleDrop}
      className={cn(
        'my-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        isDragActive && 'border-primary bg-primary/10'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        id={inputId}
      />
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center gap-4"
      >
        {insertingMany ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">{labels.clickToUploadOrDrop}</p>
          <p className="text-xs text-muted-foreground">
            {labels.imageFormatsPickSeveral}
          </p>
        </div>
      </label>
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
          placeholder={labels.enterImageUrl}
        />
        {urlError && (
          <p className="text-xs text-destructive-text">
            {labels.enterValidUrl}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Input
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder={labels.altTextOptional}
        />
      </div>
      <Button onClick={handleInsertEmbed} className="w-full" disabled={!url}>
        {labels.addImage}
      </Button>
    </div>
  );

  return (
    <NodeViewWrapper className="w-full">
      <div className="relative">
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className={cn(
              'group relative flex w-full cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors hover:bg-accent',
              selected && 'border-primary bg-primary/5'
            )}
          >
            <span className="rounded-full bg-background p-4 shadow-sm transition-colors group-hover:bg-accent">
              <ImageIcon className="h-6 w-6" />
            </span>
            <span className="text-center">
              <span className="block text-sm font-medium">
                {labels.clickToUploadOrDrop}
              </span>
              <span className="block text-xs text-muted-foreground">
                {labels.imageFormats}
              </span>
            </span>
          </button>
        ) : (
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{labels.addImage}</h3>
              <Button
                variant="ghost"
                size="icon"
                aria-label={labels.close}
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
                    {labels.upload}
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {labels.url}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload">{uploadTabContent}</TabsContent>
                <TabsContent value="url">{urlTabContent}</TabsContent>
              </Tabs>
            ) : (
              // No uploader: the Upload tab is not offered (see `hasUploader`), and a
              // lone tab is not a tab, so the URL form renders directly.
              urlTabContent
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
