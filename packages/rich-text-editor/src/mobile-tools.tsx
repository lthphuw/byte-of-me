'use client';

import { useRef, useState } from 'react';
import { cn } from '@byte-of-me/ui-utils';
import { type Editor, useEditorState } from '@tiptap/react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  type LucideIcon,
  Plus,
  Quote,
  X,
} from 'lucide-react';

import type { EditorLabelKey, EditorLabels } from './editor-labels';
import type { ImageUploadFn } from './extensions/image';
import { imageFilesFrom, resolveImages } from './extensions/upload-images';

type Tool = {
  key: string;
  /** The `EditorLabels` entry this button is named by. */
  labelKey: EditorLabelKey;
  icon: LucideIcon;
  run: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
};

const TOOLS: Tool[] = [
  {
    key: 'h1',
    labelKey: 'heading1',
    icon: Heading1,
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => e.isActive('heading', { level: 1 }),
  },
  {
    key: 'h2',
    labelKey: 'heading2',
    icon: Heading2,
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => e.isActive('heading', { level: 2 }),
  },
  {
    key: 'bold',
    labelKey: 'bold',
    icon: Bold,
    run: (e) => e.chain().focus().toggleBold().run(),
    isActive: (e) => e.isActive('bold'),
  },
  {
    key: 'italic',
    labelKey: 'italic',
    icon: Italic,
    run: (e) => e.chain().focus().toggleItalic().run(),
    isActive: (e) => e.isActive('italic'),
  },
  {
    key: 'bullet',
    labelKey: 'bulletList',
    icon: List,
    run: (e) => e.chain().focus().toggleBulletList().run(),
    isActive: (e) => e.isActive('bulletList'),
  },
  {
    key: 'ordered',
    labelKey: 'numberedList',
    icon: ListOrdered,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e) => e.isActive('orderedList'),
  },
  {
    key: 'quote',
    labelKey: 'quote',
    icon: Quote,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e) => e.isActive('blockquote'),
  },
  {
    key: 'code',
    labelKey: 'codeBlock',
    icon: Code,
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
    isActive: (e) => e.isActive('codeBlock'),
  },
];

/**
 * The touch counterpart to markdown input rules and drag-and-drop, neither of
 * which a phone has. One thumb-sized button opens the tools; it shows under `md`
 * only, and never on a compact editor, whose bar is hidden below `sm`.
 */
export function MobileEditorTools({
  editor,
  uploadImage,
  uploadFailedText,
  labels,
}: {
  editor: Editor;
  uploadImage?: ImageUploadFn;
  /** What the author sees when an upload is refused, already translated. */
  uploadFailedText: string;
  labels: EditorLabels;
}) {
  const [open, setOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // The host does not re-render per transaction, so the pressed states have to
  // be subscribed to; indexed like `TOOLS`.
  const pressed = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      TOOLS.map((tool) => tool.isActive?.(current)),
  });

  // One picked image is inserted on its own, several become a row — the same
  // rule the image placeholder follows on a desktop, so the gesture means the
  // same thing on both.
  const insertImages = async (files: File[]) => {
    const images = await resolveImages(editor, files, uploadFailedText);
    if (images.length > 0) editor.chain().focus().setImageGroup(images).run();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 md:hidden">
      {/* The sheet of tools. Anchored to the button rather than centred so a
          thumb resting on the button does not cover the thing it just
          opened. */}
      {open && (
        <div
          className="pointer-events-auto absolute bottom-20 right-4 grid w-56 grid-cols-4 gap-2 rounded-xl border bg-popover p-2 shadow-lg"
          role="toolbar"
          aria-label={labels.formatting}
        >
          {uploadImage && (
            <button
              type="button"
              aria-label={labels.insertImage}
              className="flex aspect-square min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => fileInput.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          )}

          {TOOLS.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                type="button"
                aria-label={labels[tool.labelKey]}
                aria-pressed={pressed[index]}
                className={cn(
                  'flex aspect-square min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  pressed[index]
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => {
                  tool.run(editor);
                  // Left open deliberately: formatting on a phone comes in
                  // runs — bold, then a list, then a heading — and closing
                  // after each one would cost a tap every time.
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        aria-label={
          open ? labels.closeFormattingTools : labels.openFormattingTools
        }
        aria-expanded={open}
        className="pointer-events-auto absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>

      {uploadImage && (
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = imageFilesFrom(event.target.files);
            // Reset first: picking the same file twice in a row fires no
            // change event otherwise, so the second insert silently does
            // nothing.
            event.target.value = '';
            if (files.length > 0) void insertImages(files);
          }}
        />
      )}
    </div>
  );
}
