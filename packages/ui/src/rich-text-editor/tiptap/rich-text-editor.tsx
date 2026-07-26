'use client';

import { useState } from 'react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import TableOfContents, {
  getHierarchicalIndexes,
  type TableOfContentDataItem,
} from '@tiptap/extension-table-of-contents';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import {
  type Content,
  EditorContent,
  type Extension,
  type JSONContent,
  useEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../index';
import { cn } from '../../lib/utils';

import { EditorPreview } from './editor-preview';
import { TipTapFloatingMenu } from './extensions/floating-menu';
import { FloatingToolbar } from './extensions/floating-toolbar';
import {
  ImageExtension,
  type ImageUploadFn,
} from './extensions/image';
import { ImagePlaceholder } from './extensions/image-placeholder';
import { Citation } from './extensions/references/citation';
import { ReferenceList } from './extensions/references/reference-list';
import { ReferencePanel } from './extensions/references/reference-panel';
import SearchAndReplace from './extensions/search-and-replace';
// Shared with the server-side render schema so both stay identical.
import { CustomHeading } from './render-extensions';
import { EditorToolbar } from './toolbars/editor-toolbar';

import './tiptap.css';

// The editor is already a lazy chunk, so the full common grammar set is fine.
const lowlight = createLowlight(common);

const DEFAULT_PLACEHOLDER = "Write, type '/' for commands";

export function createExtensions(options?: {
  uploadImage?: ImageUploadFn;
  placeholder?: string;
}) {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      // Registered explicitly below; leaving them on duplicates the extension
      // names ('link', 'underline') and Tiptap warns on every editor mount.
      link: false,
      underline: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    CustomHeading,
    Placeholder.configure({
      placeholder: options?.placeholder ?? DEFAULT_PLACEHOLDER,
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Subscript,
    Superscript,
    Underline,
    Link,
    Color,
    Highlight.configure({ multicolor: true }),
    ImageExtension.configure({ uploadFn: options?.uploadImage }),
    ImagePlaceholder,
    SearchAndReplace,
    Typography,
    TableKit.configure({ table: { resizable: false } }),
    // Markdown in, markdown understood: pasting a README-style document turns
    // into real headings/lists/tables/code blocks instead of flat text.
    Markdown,
    Citation,
    ReferenceList,
  ];
}



type RichTextEditorProps = {
  className?: string;
  value?: Content;
  onChange?: (value: JSONContent) => void;
  uploadImage?: ImageUploadFn;
  /**
   * Drops the outline/references sidebar and lets the editor size itself to
   * its content, so it can sit inside a form card instead of owning a page.
   */
  compact?: boolean;
  /** Editing area height floor, in px. Defaults to 600 (full) / 160 (compact). */
  minHeight?: number;
  placeholder?: string;
};

const COMPACT_MAX_HEIGHT = 360;

export function RichTextEditor({
  className,
  value,
  onChange,
  uploadImage,
  compact = false,
  minHeight,
  placeholder,
}: RichTextEditorProps) {
  const [items, setItems] = useState<TableOfContentDataItem[]>([]);
  // Snapshot of the document taken when preview is switched on. The editor
  // stays mounted (hidden) underneath, so toggling back loses nothing.
  const [preview, setPreview] = useState<JSONContent | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    // Tiptap 3 stops re-rendering on transactions by default, which leaves
    // every toolbar reading stale `isActive`/`can()`/`getAttributes` state.
    shouldRerenderOnTransaction: true,
    extensions: [
      ...createExtensions({ uploadImage, placeholder }),
      // The outline is only ever read by the sidebar, so compact mode skips
      // tracking it entirely.
      ...(compact
        ? []
        : [
            TableOfContents.configure({
              getIndex: getHierarchicalIndexes,
              onUpdate(content) {
                setItems(content);
              },
            }),
          ]),
    ] as Extension[],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  if (!editor) return null;

  return (
    <div
      // `overflow-clip`, NOT `overflow-hidden`: hidden makes this element a
      // scroll container, which traps the toolbar's `sticky top-0` inside it —
      // scroll the page/dialog and the toolbar drifts away. `clip` still cuts
      // the rounded corners but lets sticky anchor to the outer scrollport.
      className={cn(
        'relative flex w-full flex-col overflow-clip border bg-card',
        className
      )}
    >
      <EditorToolbar
        editor={editor}
        compact={compact}
        previewing={preview !== null}
        onTogglePreview={
          compact
            ? undefined
            : () => setPreview((p) => (p ? null : editor.getJSON()))
        }
      />

      <div
        // Viewport-relative on tall screens, capped on short ones — a fixed
        // 600px left the editor cramped inside the near-full-height dialog.
        className={cn('flex flex-row', !compact && 'h-[min(720px,62dvh)]')}
        style={
          compact
            ? { minHeight: minHeight ?? 160, maxHeight: COMPACT_MAX_HEIGHT }
            : undefined
        }
      >
        {preview !== null && <EditorPreview content={preview} />}

        {/* Editor Side */}
        {/* `min-w-0` keeps a wide line (long URL, table, code block) scrolling
            inside the editor instead of stretching its container. */}
        <div
          className={cn(
            'relative min-w-0 flex-1 overflow-y-auto p-4 sm:p-6',
            !compact && 'border-r',
            compact && 'p-3 sm:p-4',
            preview !== null && 'hidden'
          )}
        >
          {/* Both are page-scale surfaces: a full-width bubble bar and a
              20-item slash palette overwhelm an editor embedded in a form
              card, where the toolbar above already covers everything. */}
          {!compact && (
            <>
              <FloatingToolbar editor={editor} />
              <TipTapFloatingMenu editor={editor} />
            </>
          )}
          <EditorContent editor={editor} />
        </div>

        {!compact && preview === null && (
        <aside className="hidden w-72 shrink-0 bg-muted/10 lg:block">
          <Tabs defaultValue="outline" className="flex h-full flex-col">
            <TabsList className="m-3 grid grid-cols-2">
              <TabsTrigger value="outline">Outline</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
            </TabsList>

            <TabsContent
              value="outline"
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 pb-6"
            >
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
                      item.isActive && 'text-primary border-primary',
                      item.level === 1 && 'font-bold text-sm',
                      item.level === 2 && 'ml-2 font-semibold',
                      item.level === 3 && 'ml-4  font-normal text-muted-foreground'
                    )}
                  >
                    {item.textContent}
                  </button>
                ))}
                {items.length === 0 && (
                  <p className="px-4 py-1 text-xs text-muted-foreground">
                    Headings you add will show up here.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="references"
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 pb-6"
            >
              <ReferencePanel editor={editor} />
            </TabsContent>
          </Tabs>
        </aside>
        )}
      </div>
    </div>
  );
}
