import {
  Button,
  ScrollArea,
  ScrollBar,
  Separator,
  TooltipProvider,
} from '@byte-of-me/ui-primitives';
import { cn } from '@byte-of-me/ui-utils';
import type { Editor } from '@tiptap/core';
import { Eye, Pencil } from 'lucide-react';

import type { EditorLabels } from '../editor-labels';

import { AlignmentTooolbar } from './alignment';
import {
  BlockquoteToolbar,
  BoldToolbar,
  BulletListToolbar,
  CodeBlockToolbar,
  CodeToolbar,
  HorizontalRuleToolbar,
  ImagePlaceholderToolbar,
  ItalicToolbar,
  OrderedListToolbar,
  RedoToolbar,
  StrikeThroughToolbar,
  UnderlineToolbar,
  UndoToolbar,
} from './basic-toolbars';
import { CitationToolbar } from './citation';
import { ColorHighlightToolbar } from './color-and-highlight';
import { HeadingsToolbar } from './headings';
import { LinkToolbar } from './link';
import { SearchAndReplaceToolbar } from './search-and-replace-toolbar';
import { TableToolbar } from './table';
import { ToolbarProvider } from './toolbar-provider';

type EditorToolbarProps = {
  editor: Editor;
  /** The app's text for every control on this bar. Required; see `EditorLabels`. */
  labels: EditorLabels;
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
  labels,
  compact = false,
  previewing = false,
  onTogglePreview,
}: EditorToolbarProps) => {
  // While previewing, every editing control targets a hidden document — so
  // the toolbar collapses to a single way back.
  if (previewing) {
    return (
      <div className="sticky top-0 z-20 flex w-full items-center justify-between border-b bg-background px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {labels.previewNotice}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={onTogglePreview}
        >
          <Pencil className="h-3.5 w-3.5" />
          {labels.edit}
        </Button>
      </div>
    );
  }

  // Compact editors sit in dialogs too narrow for the row, so it wraps: a ScrollArea with a
  // hidden scrollbar leaves overflowing buttons (image, colour) unreachable. The full editor
  // owns the page width and scrolls one row. Buttons: 44px on touch, 8px apart; tighter with a pointer.
  const row = (
    <div
      className={cn(
        'flex items-center gap-2 can-hover:gap-1',
        compact && 'flex-wrap'
      )}
    >
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
    </div>
  );

  // Outside the row, so the scroller never takes it off-screen.
  const preview = onTogglePreview && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 shrink-0 gap-2 px-2 text-xs max-sm:order-first"
      onClick={onTogglePreview}
    >
      <Eye className="h-3.5 w-3.5" />
      {labels.preview}
    </Button>
  );

  return (
    <div
      className={cn(
        'sticky top-0 z-20 w-full border-b bg-background',
        // Compact editors keep the bar off phones: at 44px touch targets its
        // wrapped rows would fill the dialog. Full editors show it at every width.
        compact && 'hidden sm:block'
      )}
    >
      <ToolbarProvider editor={editor} labels={labels}>
        <TooltipProvider>
          {compact ? (
            <div className="flex items-start gap-1 px-2 py-0.5">
              <div className="min-w-0 flex-1">{row}</div>
              {preview}
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5">
              {/* `min-w-0` lets the scroller shrink below its row's width. */}
              <ScrollArea className="h-fit min-w-0 flex-1">
                <div>{row}</div>
                <ScrollBar className="hidden" orientation="horizontal" />
              </ScrollArea>
              {preview}
            </div>
          )}
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};
