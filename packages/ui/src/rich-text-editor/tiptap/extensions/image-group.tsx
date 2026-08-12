'use client';

import { useRef, useState } from 'react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { ImagePlus, Loader2, Trash } from 'lucide-react';

import { Button } from '../../../button';
import { cn } from '../../../lib/utils';

import { IMAGE_GROUP_NAME, ImageGroupBase } from './image-base';
import { ImageCaption } from './image-caption';
import { imageFilesFrom, resolveImages } from './upload-images';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageGroup: {
      /**
       * Inserts images side by side. A single image is inserted on its own —
       * a one-image row is a figure with extra steps, and every insert path
       * hands this whatever the author happened to pick.
       */
      setImageGroup: (
        images: { src: string; alt?: string }[],
        caption?: string
      ) => ReturnType;
    };
  }
}

/**
 * Editable row node: the render schema from `image-base.ts` plus the node view
 * and command, which only the editor needs.
 */
export const ImageGroup = ImageGroupBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageGroupView);
  },

  /**
   * Sweeps up rows the author emptied.
   *
   * The row's content is `image*` because `image+` makes ProseMirror *repair*
   * a row whose last image was deleted, by inserting an empty image node — see
   * `image-base.ts`. So the empty row is allowed, and removed here, one
   * transaction later. That covers every delete path at once (the node's own
   * menu, Backspace on a selected image, a drag out of the row) rather than
   * each one separately.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imageGroupCleanup'),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const empty: number[] = [];
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== IMAGE_GROUP_NAME) return true;
            if (node.childCount === 0) empty.push(pos);
            // Rows do not nest; nothing inside one can be another.
            return false;
          });

          if (empty.length === 0) return null;

          const tr = newState.tr;
          // Back to front so the earlier positions stay valid.
          for (let i = empty.length - 1; i >= 0; i -= 1) {
            const node = newState.doc.nodeAt(empty[i]);
            if (node) tr.delete(empty[i], empty[i] + node.nodeSize);
          }

          return tr;
        },
      }),
    ];
  },

  addCommands() {
    return {
      setImageGroup:
        (images, caption = '') =>
        ({ commands }) => {
          if (images.length === 0) return false;

          if (images.length === 1) {
            return commands.insertContent({
              type: 'image',
              attrs: { ...images[0], caption },
            });
          }

          return commands.insertContent({
            type: IMAGE_GROUP_NAME,
            attrs: { caption },
            content: images.map((image) => ({ type: 'image', attrs: image })),
          });
        },
    };
  },
});

function ImageGroupView({
  node,
  editor,
  selected,
  getPos,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const addImages = async (files: File[]) => {
    if (files.length === 0 || typeof getPos() !== 'number') return;

    setUploading(true);
    try {
      const images = await resolveImages(editor, files);
      if (images.length === 0) return;

      // Resolved after the upload, never before it: the round trip gives the
      // author time to type, and a position captured up front would land the
      // images inside whatever moved.
      const at = getPos();
      if (typeof at !== 'number') return;
      const row = editor.state.doc.nodeAt(at);
      if (!row) return;

      // One inside the row's closing token — the end of its content.
      const end = at + row.nodeSize - 1;

      editor
        .chain()
        .insertContentAt(
          end,
          images.map((image) => ({ type: 'image', attrs: image }))
        )
        .run();
    } finally {
      setUploading(false);
    }
  };

  return (
    <NodeViewWrapper
      as="figure"
      className={cn(
        'group/row relative my-4 rounded-md border-2 border-transparent',
        selected && 'border-blue-300'
      )}
    >
      {/* The images. `image-group-items` is the same class the published page
          uses, so the row wraps and stacks in the editor exactly as it does
          for a reader. */}
      <NodeViewContent className="image-group-items" />

      <ImageCaption
        caption={typeof node.attrs.caption === 'string' ? node.attrs.caption : ''}
        editable={editor.isEditable}
        placeholder="Caption for this row"
        onChange={(caption) => updateAttributes({ caption })}
      />

      {editor.isEditable && (
        <div className="absolute right-2 top-2 flex gap-1 rounded bg-background/80 p-1 opacity-0 transition-opacity group-hover/row:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Add an image to this row"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete this row"
            onClick={deleteNode}
          >
            <Trash className="size-4" />
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              const files = imageFilesFrom(event.target.files);
              // Reset first: picking the same file twice in a row fires no
              // change event otherwise, and the second add does nothing.
              event.target.value = '';
              void addImages(files);
            }}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}
