'use client';

import { useState } from 'react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
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
import { EditorContent, type Extension,useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import { createLowlight } from 'lowlight';

import { EditorToolbar } from './toolbars/editor-toolbar';

import './tiptap.css';

import { cn } from '@/shared/lib/utils';
import { TipTapFloatingMenu } from '@/shared/ui/tiptap/extensions/floating-menu';
import { FloatingToolbar } from '@/shared/ui/tiptap/extensions/floating-toolbar';
import { ImageExtension } from '@/shared/ui/tiptap/extensions/image';
import { ImagePlaceholder } from '@/shared/ui/tiptap/extensions/image-placeholder';
import SearchAndReplace from '@/shared/ui/tiptap/extensions/search-and-replace';

const lowlight = createLowlight();

lowlight.register('js', javascript);
lowlight.register('ts', typescript);

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

export const extensions = [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
  }),
  CodeBlockLowlight.configure({
    lowlight,
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
  value?: Any;
  onChange?: (value: Any) => void;
};

export function RichTextEditor({
  className,
  value,
  onChange,
}: RichTextEditorProps) {
  const [items, setItems] = useState<Any[]>([]);

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
    <div
      className={cn(
        'flex flex-col w-full border bg-card relative overflow-hidden',
        className
      )}
    >
      <EditorToolbar editor={editor} />

      <div className="flex h-[600px] flex-row">
        {/* Editor Side */}
        <div className="relative flex-1 overflow-y-auto border-r p-4 sm:p-6">
          <FloatingToolbar editor={editor} />
          <TipTapFloatingMenu editor={editor} />
          <EditorContent editor={editor} />
        </div>

        <aside className="hidden w-64 overflow-y-auto bg-muted/10 p-6 lg:block">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Table of Contents
          </p>
          <div className="flex flex-col gap-2 border-l border-muted-foreground/20">
            {items.map((item) => (
              <button
                type={'button'}
                key={item.id}
                onClick={(e) => {
                  e?.preventDefault();

                  const el = document.getElementById(item.id);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={cn(
                  'text-xs text-left px-4 py-1 hover:text-primary transition-all border-l-2 -ml-[1px] border-transparent hover:border-primary',
                  item.active && 'text-primary border-primary',
                  item.level === 1 && 'font-bold text-sm',
                  item.level === 2 && 'ml-2 font-semibold',
                  item.level === 3 && 'ml-4  font-normal text-muted-foreground'
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
