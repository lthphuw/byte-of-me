import * as React from 'react';
import {
  CaretDownIcon,
  CodeIcon,
  DividerHorizontalIcon,
  PlusIcon,
  QuoteIcon,
} from '@radix-ui/react-icons';
import type { Editor } from '@tiptap/react';
import type { VariantProps } from 'class-variance-authority';

import { ImageEditDialog } from '@/shared/ui/minimal-tiptap/components/image/image-edit-dialog';
import { LinkEditPopover } from '@/shared/ui/minimal-tiptap/components/link/link-edit-popover';
import { ToolbarSection } from '@/shared/ui/minimal-tiptap/components/toolbar-section';
import type { FormatAction } from '@/shared/ui/minimal-tiptap/types';
import type { toggleVariants } from '@/shared/ui/toggle';

type InsertElementAction = 'codeBlock' | 'blockquote' | 'horizontalRule';
interface InsertElement extends FormatAction {
  value: InsertElementAction;
}

const formatActions: InsertElement[] = [
  {
    value: 'codeBlock',
    label: 'Code block',
    icon: <CodeIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive('codeBlock'),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleCodeBlock().run(),
    shortcuts: ['mod', 'alt', 'C'],
  },
  {
    value: 'blockquote',
    label: 'Blockquote',
    icon: <QuoteIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote'),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBlockquote().run(),
    shortcuts: ['mod', 'shift', 'B'],
  },
  {
    value: 'horizontalRule',
    label: 'Divider',
    icon: <DividerHorizontalIcon className="size-5" />,
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    isActive: () => false,
    canExecute: (editor) =>
      editor.can().chain().focus().setHorizontalRule().run(),
    shortcuts: ['mod', 'alt', '-'],
  },
];

interface SectionFiveProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
  activeActions?: InsertElementAction[];
  mainActionCount?: number;
}

export const SectionFive: React.FC<SectionFiveProps> = ({
  editor,
  activeActions = formatActions.map((action) => action.value),
  mainActionCount = 0,
  size,
  variant,
}) => {
  return (
    <>
      <LinkEditPopover editor={editor} size={size} variant={variant} />
      <ImageEditDialog editor={editor} size={size} variant={variant} />
      <ToolbarSection
        editor={editor}
        actions={formatActions}
        activeActions={activeActions}
        mainActionCount={mainActionCount}
        dropdownIcon={
          <>
            <PlusIcon className="size-5" />
            <CaretDownIcon className="size-5" />
          </>
        }
        dropdownTooltip="Insert elements"
        size={size}
        variant={variant}
      />
    </>
  );
};

SectionFive.displayName = 'SectionFive';

export default SectionFive;
