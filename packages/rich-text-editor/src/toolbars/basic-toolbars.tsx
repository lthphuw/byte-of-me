'use client';

import * as React from 'react';
import type { ButtonProps } from '@byte-of-me/ui-primitives';
import type { ChainedCommands } from '@tiptap/core';
import {
  BoldIcon,
  Code,
  Code2,
  ImageIcon,
  ItalicIcon,
  List,
  ListOrdered,
  Redo2,
  SeparatorHorizontal,
  Strikethrough,
  TextQuote,
  UnderlineIcon,
  Undo2,
} from 'lucide-react';

import type { EditorLabels } from '../editor-labels';

import { ToolbarButton } from './toolbar-button';
import { type ToolbarState, useToolbar } from './toolbar-provider';

interface ToolbarButtonSpec {
  displayName: string;
  icon: React.ComponentProps<typeof ToolbarButton>['icon'];
  label: keyof EditorLabels;
  /** TipTap's own key binding for the command, when it has one. */
  shortcut?: string;
  run: (chain: ChainedCommands) => ChainedCommands;
  active?: (state: ToolbarState) => boolean;
  disabled?: (state: ToolbarState) => boolean;
}

/** A button for one editor command, reading its state from the toolbar context. */
function createToolbarButton(spec: ToolbarButtonSpec) {
  const Button = React.forwardRef<
    HTMLButtonElement,
    Omit<ButtonProps, 'children' | 'asChild'>
  >(({ onClick, ...props }, ref) => {
    const { editor, state, labels } = useToolbar();

    return (
      <ToolbarButton
        ref={ref}
        icon={spec.icon}
        label={labels[spec.label]}
        shortcut={spec.shortcut}
        active={spec.active?.(state)}
        disabled={spec.disabled?.(state)}
        onClick={(event) => {
          spec.run(editor.chain().focus()).run();
          onClick?.(event);
        }}
        {...props}
      />
    );
  });
  Button.displayName = spec.displayName;
  return Button;
}

export const UndoToolbar = createToolbarButton({
  displayName: 'UndoToolbar',
  icon: Undo2,
  label: 'undo',
  run: (chain) => chain.undo(),
  disabled: (state) => !state.canUndo,
});

export const RedoToolbar = createToolbarButton({
  displayName: 'RedoToolbar',
  icon: Redo2,
  label: 'redo',
  run: (chain) => chain.redo(),
  disabled: (state) => !state.canRedo,
});

export const BlockquoteToolbar = createToolbarButton({
  displayName: 'BlockquoteToolbar',
  icon: TextQuote,
  label: 'blockquote',
  shortcut: 'Mod-Shift-b',
  run: (chain) => chain.toggleBlockquote(),
  active: (state) => state.toggles.blockquote.active,
  disabled: (state) => !state.toggles.blockquote.can,
});

export const CodeToolbar = createToolbarButton({
  displayName: 'CodeToolbar',
  icon: Code2,
  label: 'code',
  shortcut: 'Mod-e',
  run: (chain) => chain.toggleCode(),
  active: (state) => state.toggles.code.active,
  disabled: (state) => !state.toggles.code.can,
});

export const CodeBlockToolbar = createToolbarButton({
  displayName: 'CodeBlockToolbar',
  icon: Code,
  label: 'codeBlock',
  shortcut: 'Mod-Alt-c',
  run: (chain) => chain.toggleCodeBlock(),
  active: (state) => state.toggles.codeBlock.active,
  disabled: (state) => !state.toggles.codeBlock.can,
});

export const BoldToolbar = createToolbarButton({
  displayName: 'BoldToolbar',
  icon: BoldIcon,
  label: 'bold',
  shortcut: 'Mod-b',
  run: (chain) => chain.toggleBold(),
  active: (state) => state.toggles.bold.active,
  disabled: (state) => !state.toggles.bold.can,
});

export const ItalicToolbar = createToolbarButton({
  displayName: 'ItalicToolbar',
  icon: ItalicIcon,
  label: 'italic',
  shortcut: 'Mod-i',
  run: (chain) => chain.toggleItalic(),
  active: (state) => state.toggles.italic.active,
  disabled: (state) => !state.toggles.italic.can,
});

export const UnderlineToolbar = createToolbarButton({
  displayName: 'UnderlineToolbar',
  icon: UnderlineIcon,
  label: 'underline',
  shortcut: 'Mod-u',
  run: (chain) => chain.toggleUnderline(),
  active: (state) => state.toggles.underline.active,
  disabled: (state) => !state.toggles.underline.can,
});

export const StrikeThroughToolbar = createToolbarButton({
  displayName: 'StrikeThroughToolbar',
  icon: Strikethrough,
  label: 'strikethrough',
  shortcut: 'Mod-Shift-s',
  run: (chain) => chain.toggleStrike(),
  active: (state) => state.toggles.strike.active,
  disabled: (state) => !state.toggles.strike.can,
});

export const BulletListToolbar = createToolbarButton({
  displayName: 'BulletListToolbar',
  icon: List,
  label: 'bulletList',
  run: (chain) => chain.toggleBulletList(),
  active: (state) => state.toggles.bulletList.active,
  disabled: (state) => !state.toggles.bulletList.can,
});

export const OrderedListToolbar = createToolbarButton({
  displayName: 'OrderedListToolbar',
  icon: ListOrdered,
  label: 'orderedList',
  run: (chain) => chain.toggleOrderedList(),
  active: (state) => state.toggles.orderedList.active,
  disabled: (state) => !state.toggles.orderedList.can,
});

export const HorizontalRuleToolbar = createToolbarButton({
  displayName: 'HorizontalRuleToolbar',
  icon: SeparatorHorizontal,
  label: 'horizontalRule',
  run: (chain) => chain.setHorizontalRule(),
});

export const ImagePlaceholderToolbar = createToolbarButton({
  displayName: 'ImagePlaceholderToolbar',
  icon: ImageIcon,
  label: 'image',
  run: (chain) => chain.insertImagePlaceholder(),
  active: (state) => state.imagePlaceholderActive,
});
