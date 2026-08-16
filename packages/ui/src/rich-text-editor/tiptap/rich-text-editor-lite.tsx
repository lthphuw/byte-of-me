'use client';

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { cn } from '../../lib/utils';

import './tiptap-lite.css';

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function RichTextEditorLite({ value, onChange, className }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        // Link is registered explicitly below with its own config.
        link: false,
      }),
      Link,
      Placeholder.configure({
        placeholder: 'Write your message...',
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        // `text-base md:text-sm`, not a bare `text-sm`: iOS Safari zooms the
        // page when a focused field computes under 16px, and a contenteditable
        // is no exception. The viewport no longer sets `maximum-scale=1` (that
        // blocked pinch-zoom, WCAG 1.4.4), so this is the only thing stopping
        // the page jumping the moment someone taps into the message box.
        // Matches how the shared `Input` already handles the same threshold.
        class:
          'w-full min-h-[120px] max-h-[200px] overflow-y-auto rounded-md border text-base focus:outline-none md:text-sm',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className={cn('w-full', className)}>
      {/* Minimal toolbar */}
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="rounded border px-2 py-1 text-xs"
        >
          Bold
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="rounded border px-2 py-1 text-xs"
        >
          Italic
        </button>

        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className="rounded border px-2 py-1 text-xs"
        >
          Link
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
