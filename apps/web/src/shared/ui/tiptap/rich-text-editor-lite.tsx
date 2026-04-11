'use client';

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import './tiptap-lite.css';
import { cn } from '@/shared/lib/utils';





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
      }),
      Link,
      Placeholder.configure({
        placeholder: 'Write your message...',
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[120px] max-h-[200px] overflow-y-auto rounded-md border text-sm focus:outline-none',
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
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="text-xs px-2 py-1 border rounded"
        >
          Bold
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="text-xs px-2 py-1 border rounded"
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
          className="text-xs px-2 py-1 border rounded"
        >
          Link
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
