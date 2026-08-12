'use client';

import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Plus,
  Quote,
  X,
} from 'lucide-react';

import { cn } from '../../lib/utils';

import type { ImageUploadFn } from './extensions/image';
import { imageFilesFrom, resolveImages } from './extensions/upload-images';

/**
 * The touch counterpart to drag-and-drop and markdown input rules.
 *
 * On a desktop the chromeless editor needs no buttons: `## ` becomes a
 * heading as it is typed, and an image is dragged onto the page. Neither
 * gesture exists on a phone — there is no drag source, and a soft keyboard
 * makes `> ` and `- ` fiddly rather than fluent — so the same affordances are
 * reachable from one thumb-sized button instead of a bar that would eat a
 * quarter of a small screen.
 *
 * Rendered only under `md`, and only for the chromeless editor: everywhere
 * else the real toolbar is already on screen.
 */

type Tool = {
  key: string;
  label: string;
  icon: typeof Bold;
  run: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
};

const TOOLS: Tool[] = [
  {
    key: 'h1',
    label: 'Heading 1',
    icon: Heading1,
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => e.isActive('heading', { level: 1 }),
  },
  {
    key: 'h2',
    label: 'Heading 2',
    icon: Heading2,
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => e.isActive('heading', { level: 2 }),
  },
  {
    key: 'bold',
    label: 'Bold',
    icon: Bold,
    run: (e) => e.chain().focus().toggleBold().run(),
    isActive: (e) => e.isActive('bold'),
  },
  {
    key: 'italic',
    label: 'Italic',
    icon: Italic,
    run: (e) => e.chain().focus().toggleItalic().run(),
    isActive: (e) => e.isActive('italic'),
  },
  {
    key: 'bullet',
    label: 'Bullet list',
    icon: List,
    run: (e) => e.chain().focus().toggleBulletList().run(),
    isActive: (e) => e.isActive('bulletList'),
  },
  {
    key: 'ordered',
    label: 'Numbered list',
    icon: ListOrdered,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e) => e.isActive('orderedList'),
  },
  {
    key: 'quote',
    label: 'Quote',
    icon: Quote,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e) => e.isActive('blockquote'),
  },
  {
    key: 'code',
    label: 'Code block',
    icon: Code,
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
    isActive: (e) => e.isActive('codeBlock'),
  },
];

export function MobileEditorTools({
  editor,
  uploadImage,
}: {
  editor: Editor;
  uploadImage?: ImageUploadFn;
}) {
  const [open, setOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // One picked image is inserted on its own, several become a row — the same
  // rule the image placeholder follows on a desktop, so the gesture means the
  // same thing on both.
  const insertImages = async (files: File[]) => {
    const images = await resolveImages(editor, files);
    if (images.length > 0) editor.chain().focus().setImageGroup(images).run();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 md:hidden">
      {/* The sheet of tools. Anchored to the button rather than centred so a
          thumb resting on the button does not cover the thing it just
          opened. */}
      {open && (
        <div
          className="pointer-events-auto absolute bottom-20 right-4 grid w-44 grid-cols-4 gap-1 rounded-xl border bg-popover p-2 shadow-lg"
          role="menu"
          aria-label="Formatting"
        >
          {uploadImage && (
            <button
              type="button"
              role="menuitem"
              aria-label="Insert image"
              className="flex aspect-square items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => fileInput.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          )}

          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                type="button"
                role="menuitem"
                aria-label={tool.label}
                aria-pressed={tool.isActive?.(editor) ?? undefined}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-md hover:bg-muted',
                  tool.isActive?.(editor)
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
        aria-label={open ? 'Close formatting tools' : 'Open formatting tools'}
        aria-expanded={open}
        className="pointer-events-auto absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
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
