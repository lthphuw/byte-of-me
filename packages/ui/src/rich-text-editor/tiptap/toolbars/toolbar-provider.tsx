'use client';

import React from 'react';
import {
  type Editor,
  type EditorStateSnapshot,
  useEditorState,
} from '@tiptap/react';

import type { EditorLabels } from '../editor-labels';

export const HEADING_LEVELS = [1, 2, 3, 4] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

type TextAlignment = 'left' | 'center' | 'right' | 'justify';

type ToggleState = { active: boolean; can: boolean };

/**
 * What the toolbar controls read, as plain values. The editor host does not re-render per
 * transaction, so `editor.isActive()` in render would go stale; `ToolbarProvider` subscribes once.
 */
export interface ToolbarState {
  /** Keyed by the mark/node name `isActive` takes. */
  toggles: {
    bold: ToggleState;
    italic: ToggleState;
    underline: ToggleState;
    strike: ToggleState;
    code: ToggleState;
    codeBlock: ToggleState;
    blockquote: ToggleState;
    bulletList: ToggleState;
    orderedList: ToggleState;
  };
  canUndo: boolean;
  canRedo: boolean;
  /** Any heading, of any level — which can exceed `HEADING_LEVELS`. */
  headingActive: boolean;
  headingLevel: HeadingLevel | undefined;
  link: { active: boolean; href: string; canSet: boolean };
  table: { active: boolean; canInsert: boolean };
  imageSelected: boolean;
  imagePlaceholderActive: boolean;
  textAlign: TextAlignment;
  color: string | undefined;
  highlight: string | undefined;
  canStyleText: boolean;
}

const ALIGNMENTS: readonly TextAlignment[] = [
  'left',
  'center',
  'right',
  'justify',
];

function attributeString(editor: Editor, mark: string, key: string) {
  const value: unknown = editor.getAttributes(mark)[key];
  return typeof value === 'string' ? value : undefined;
}

function toggle(editor: Editor, name: string, can: boolean): ToggleState {
  return { active: editor.isActive(name), can };
}

function selectToolbarState({
  editor,
}: EditorStateSnapshot<Editor>): ToolbarState {
  const chain = () => editor.can().chain();

  return {
    toggles: {
      bold: toggle(editor, 'bold', chain().focus().toggleBold().run()),
      italic: toggle(editor, 'italic', chain().focus().toggleItalic().run()),
      underline: toggle(
        editor,
        'underline',
        chain().focus().toggleUnderline().run()
      ),
      strike: toggle(editor, 'strike', chain().focus().toggleStrike().run()),
      code: toggle(editor, 'code', chain().focus().toggleCode().run()),
      codeBlock: toggle(
        editor,
        'codeBlock',
        chain().focus().toggleCodeBlock().run()
      ),
      blockquote: toggle(
        editor,
        'blockquote',
        chain().focus().toggleBlockquote().run()
      ),
      bulletList: toggle(
        editor,
        'bulletList',
        chain().focus().toggleBulletList().run()
      ),
      orderedList: toggle(
        editor,
        'orderedList',
        chain().focus().toggleOrderedList().run()
      ),
    },
    canUndo: chain().focus().undo().run(),
    canRedo: chain().focus().redo().run(),
    headingActive: editor.isActive('heading'),
    headingLevel: HEADING_LEVELS.find((level) =>
      editor.isActive('heading', { level })
    ),
    link: {
      active: editor.isActive('link'),
      href: attributeString(editor, 'link', 'href') ?? '',
      canSet: chain().setLink({ href: 'https://a.com' }).run(),
    },
    table: {
      active: editor.isActive('table'),
      canInsert: chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    },
    imageSelected: editor.isActive('image'),
    imagePlaceholderActive: editor.isActive('image-placeholder'),
    textAlign:
      ALIGNMENTS.find((textAlign) => editor.isActive({ textAlign })) ?? 'left',
    color: attributeString(editor, 'textStyle', 'color'),
    highlight: attributeString(editor, 'highlight', 'color'),
    canStyleText: chain().setHighlight().run() && chain().setColor('').run(),
  };
}

interface ToolbarContextProps {
  editor: Editor;
  state: ToolbarState;
  /** The app's text for every control; see `EditorLabels`. */
  labels: EditorLabels;
}

const ToolbarContext = React.createContext<ToolbarContextProps | null>(null);

interface ToolbarProviderProps {
  editor: Editor;
  labels: EditorLabels;
  children: React.ReactNode;
}

export const ToolbarProvider = ({
  editor,
  labels,
  children,
}: ToolbarProviderProps) => {
  // `useEditorState` hands back the previous object while the selection is
  // deep-equal, so the memoised value below only changes — and the controls
  // only re-render — when something a control displays actually did.
  const state = useEditorState({ editor, selector: selectToolbarState });
  const value = React.useMemo(
    () => ({ editor, state, labels }),
    [editor, state, labels]
  );

  return (
    <ToolbarContext.Provider value={value}>{children}</ToolbarContext.Provider>
  );
};

export const useToolbar = () => {
  const context = React.useContext(ToolbarContext);

  if (!context) {
    throw new Error('useToolbar must be used within a ToolbarProvider');
  }

  return context;
};
