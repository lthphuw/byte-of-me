import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { isMarkdownPaste } from '../paste-markdown';
import { stripPastedPresentation } from '../paste-presentation';

import type { ImageUploadFn } from './image-base';
import { imageFilesFrom, insertImagesAt } from './upload-images';

interface ClipboardImportOptions {
  uploadImage?: ImageUploadFn;
  uploadFailedText: string;
}

/**
 * What the writing surface does with a drop or paste: strips presentation, uploads image
 * files (at the drop point or caret), turns pasted Markdown into blocks (not in code blocks).
 * Highest priority, so no other plugin's paste handler sees the event first.
 */
export const ClipboardImport = Extension.create<ClipboardImportOptions>({
  name: 'clipboardImport',
  priority: 1000,

  addOptions() {
    return { uploadImage: undefined, uploadFailedText: '' };
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    const { uploadImage, uploadFailedText } = this.options;

    return [
      new Plugin({
        key: new PluginKey('clipboardImport'),
        props: {
          transformPastedHTML: stripPastedPresentation,

          // Only claims the event for an image file and an uploader: claiming
          // more would swallow ProseMirror's own node drags, which arrive here.
          handleDrop(view, event, _slice, moved) {
            if (moved || !uploadImage) return false;

            const files = imageFilesFrom(event.dataTransfer?.files);
            if (files.length === 0) return false;

            event.preventDefault();
            const dropped = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            void insertImagesAt(
              view,
              files,
              uploadImage,
              uploadFailedText,
              dropped?.pos
            );
            return true;
          },

          handlePaste(view, event) {
            const data = event.clipboardData;

            const files = imageFilesFrom(data?.files);
            if (uploadImage && files.length > 0) {
              event.preventDefault();
              void insertImagesAt(view, files, uploadImage, uploadFailedText);
              return true;
            }

            if (
              !editor.markdown ||
              view.state.selection.$from.parent.type.spec.code
            ) {
              return false;
            }

            const text = data?.getData('text/plain') ?? '';
            if (!isMarkdownPaste(text, data?.getData('text/html') ?? '')) {
              return false;
            }

            // The blocks, not the `doc` wrapper: a doc node cannot be inserted
            // into a doc. A parse that throws or inserts nothing leaves the
            // paste to ProseMirror, as text.
            try {
              const { content } = editor.markdown.parse(text);
              if (!content?.length || !editor.commands.insertContent(content)) {
                return false;
              }
            } catch {
              return false;
            }

            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
