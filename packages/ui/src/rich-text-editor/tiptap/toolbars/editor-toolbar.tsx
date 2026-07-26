import type { Editor } from '@tiptap/core';
import { Eye, Pencil } from 'lucide-react';

import { Button, ScrollArea, ScrollBar, Separator, TooltipProvider } from '../../../index';

import { AlignmentTooolbar } from './alignment';
import { BlockquoteToolbar } from './blockquote';
import { BoldToolbar } from './bold';
import { BulletListToolbar } from './bullet-list';
import { CitationToolbar } from './citation';
import { CodeToolbar } from './code';
import { CodeBlockToolbar } from './code-block';
import { ColorHighlightToolbar } from './color-and-highlight';
import { HeadingsToolbar } from './headings';
import { HorizontalRuleToolbar } from './horizontal-rule';
import { ImagePlaceholderToolbar } from './image-placeholder-toolbar';
import { ItalicToolbar } from './italic';
import { LinkToolbar } from './link';
import { OrderedListToolbar } from './ordered-list';
import { RedoToolbar } from './redo';
import { SearchAndReplaceToolbar } from './search-and-replace-toolbar';
import { StrikeThroughToolbar } from './strikethrough';
import { TableToolbar } from './table';
import { ToolbarProvider } from './toolbar-provider';
import { UnderlineToolbar } from './underline';
import { UndoToolbar } from './undo';

type EditorToolbarProps = {
  editor: Editor;
  /**
   * Hides the tools that depend on the references sidebar (citations) or on a
   * long document (search & replace), which compact editors don't have.
   */
  compact?: boolean;
  /** True while the editor shows the rendered preview instead of the doc. */
  previewing?: boolean;
  /** Present only on editors that offer a preview (the full editor). */
  onTogglePreview?: () => void;
};

export const EditorToolbar = ({
  editor,
  compact = false,
  previewing = false,
  onTogglePreview,
}: EditorToolbarProps) => {
  // While previewing, every editing control targets a hidden document — so
  // the toolbar collapses to a single way back.
  if (previewing) {
    return (
      <div className="sticky top-0 z-20 flex w-full items-center justify-between border-b bg-background px-3 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview — exactly as visitors will see it
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={onTogglePreview}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 hidden w-full border-b bg-background sm:block">
      <ToolbarProvider editor={editor}>
        <TooltipProvider>
          <ScrollArea className="h-fit py-0.5">
            <div>
              <div className="flex items-center gap-1 px-2">
                {/* History Group */}
                <UndoToolbar />
                <RedoToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Text Structure Group */}
                <HeadingsToolbar />
                <BlockquoteToolbar />
                <CodeToolbar />
                <CodeBlockToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Basic Formatting Group */}
                <BoldToolbar />
                <ItalicToolbar />
                <UnderlineToolbar />
                <StrikeThroughToolbar />
                <LinkToolbar />
                {!compact && <CitationToolbar />}
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Lists & Structure Group */}
                <BulletListToolbar />
                <OrderedListToolbar />
                <HorizontalRuleToolbar />
                {!compact && <TableToolbar />}
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Alignment Group */}
                <AlignmentTooolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Media & Styling Group */}
                <ImagePlaceholderToolbar />
                <ColorHighlightToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                <div className="flex-1" />

                {/* Utility Group */}
                {!compact && <SearchAndReplaceToolbar />}
                {onTogglePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 px-2 text-xs"
                    onClick={onTogglePreview}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                )}
              </div>
            </div>
            <ScrollBar className="hidden" orientation="horizontal" />
          </ScrollArea>
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};
