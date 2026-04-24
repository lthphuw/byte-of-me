'use client';

import { useEffect } from 'react';
import { type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { ScrollArea, ScrollBar, Separator, TooltipProvider } from '@/shared/ui';
import { AlignmentTooolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/alignment';
import { BlockquoteToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/blockquote';
import { BoldToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/bold';
import { BulletListToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/bullet-list';
import { ColorHighlightToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/color-and-highlight';
import { HeadingsToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/headings';
import { ImagePlaceholderToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/image-placeholder-toolbar';
import { ItalicToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/italic';
import { LinkToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/link';
import { OrderedListToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/ordered-list';
import { ToolbarProvider } from '@/shared/ui/rich-text-editor/tiptap/toolbars/toolbar-provider';
import { UnderlineToolbar } from '@/shared/ui/rich-text-editor/tiptap/toolbars/underline';

export function FloatingToolbar({ editor }: { editor: Editor | null }) {
  const isMobile = useMediaQuery('(max-width: 640px)');

  // Prevent default context menu on mobile
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom || !isMobile) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const el = editor.view.dom;
    el.addEventListener('contextmenu', handleContextMenu);

    return () => {
      el.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [editor, isMobile]);

  if (!editor) return null;

  if (isMobile) {
    return (
      <TooltipProvider>
        <BubbleMenu
          // tippyOptions={{
          //   duration: 100,
          //   placement: "bottom",
          //   offset: [0, 10],
          // }}
          shouldShow={() => {
            // Show toolbar when editor is focused and has selection
            return editor.isEditable && editor.isFocused;
          }}
          editor={editor}
          className="mx-0 w-full min-w-full rounded-sm border bg-background shadow-sm"
        >
          <ToolbarProvider editor={editor}>
            <ScrollArea className="h-fit w-full py-0.5">
              <div className="flex items-center gap-0.5 px-2">
                <div className="flex items-center gap-0.5 p-1">
                  {/* Primary formatting */}
                  <BoldToolbar />
                  <ItalicToolbar />
                  <UnderlineToolbar />
                  <Separator orientation="vertical" className="mx-1 h-6" />

                  {/* Structure controls */}
                  <HeadingsToolbar />
                  <BulletListToolbar />
                  <OrderedListToolbar />
                  <Separator orientation="vertical" className="mx-1 h-6" />

                  {/* Rich formatting */}
                  <ColorHighlightToolbar />
                  <LinkToolbar />
                  <ImagePlaceholderToolbar />
                  <Separator orientation="vertical" className="mx-1 h-6" />

                  {/* Additional controls */}
                  <AlignmentTooolbar />
                  <BlockquoteToolbar />
                </div>
              </div>
              <ScrollBar className="h-0.5" orientation="horizontal" />
            </ScrollArea>
          </ToolbarProvider>
        </BubbleMenu>
      </TooltipProvider>
    );
  }

  return null;
}
