'use client';

import { useState } from 'react';

import './tiptap.css';
import { Color } from '@tiptap/extension-color';
import Heading from '@tiptap/extension-heading';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TableOfContents, {
  getHierarchicalIndexes,
} from '@tiptap/extension-table-of-contents';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { EditorContent, Extension, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { cn } from '@/lib/utils';
import { TipTapFloatingMenu } from '@/components/tiptap/extensions/floating-menu';
import { FloatingToolbar } from '@/components/tiptap/extensions/floating-toolbar';
import { ImageExtension } from '@/components/tiptap/extensions/image';
import { ImagePlaceholder } from '@/components/tiptap/extensions/image-placeholder';
import SearchAndReplace from '@/components/tiptap/extensions/search-and-replace';

import { EditorToolbar } from './toolbars/editor-toolbar';


const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        renderHTML: (attributes) => ({
          id: attributes.id,
        }),
        parseHTML: (element) => element.getAttribute('id'),
      },
    };
  },
});

// 1. Export the base extensions here so your other modules don't break
export const extensions = [
  StarterKit.configure({
    heading: false, // We use CustomHeading instead
  }),
  CustomHeading,
  Placeholder.configure({
    placeholder: "Write, type '/' for commands",
  }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Subscript,
  Superscript,
  Underline,
  Link,
  Color,
  Highlight.configure({ multicolor: true }),
  ImageExtension,
  ImagePlaceholder,
  SearchAndReplace,
  Typography,
];

type RichTextEditorProps = {
  className?: string;
  value?: any;
  onChange?: (value: any) => void;
};

export function RichTextEditor({ className, value, onChange }: RichTextEditorProps) {
  const [items, setItems] = useState<any[]>([]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...extensions,
      TableOfContents.configure({
        getIndex: getHierarchicalIndexes,
        onUpdate(content) {
          setItems(content);
        },
      }),
    ] as Extension[],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  if (!editor) return null;

  return (
    <div className={cn('flex flex-col w-full border bg-card relative overflow-hidden', className)}>
      <EditorToolbar editor={editor} />

      <div className="flex flex-row h-[600px]">
        {/* Editor Side */}
        <div className="flex-1 overflow-y-auto relative p-4 sm:p-6 border-r">
          <FloatingToolbar editor={editor} />
          <TipTapFloatingMenu editor={editor} />
          <EditorContent editor={editor} />
        </div>

        <aside className="hidden lg:block w-64 p-6 bg-muted/10 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Table of Contents
          </p>
          <div className="flex flex-col gap-2 border-l border-muted-foreground/20">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e?.preventDefault();

                  const el = document.getElementById(item.id);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={cn(
                  "text-xs text-left px-4 py-1 hover:text-primary transition-all border-l-2 -ml-[1px] border-transparent hover:border-primary",
                  item.active && "text-primary border-primary",
                  item.level === 1 && "font-bold text-sm",
                  item.level === 2 && "ml-2 font-semibold",
                  item.level === 3 && "ml-4  font-normal text-muted-foreground",

                )}
              >
                {item.textContent}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
